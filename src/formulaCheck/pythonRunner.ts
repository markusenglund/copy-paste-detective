import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logger } from "../utils/logger";
import type { Interval } from "./intervalCheck";

export type RowIntervals = Record<string, Interval>;

export type RowResult =
  | { ok: true; min: number; max: number }
  | { ok: false; error: string };

export type EvaluateResult = {
  usedOperands: string[];
  results: RowResult[];
};

const rowResultSchema: z.ZodType<RowResult> = z.union([
  z.object({
    ok: z.literal(true),
    min: z.number(),
    max: z.number(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

const responseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ok"),
    id: z.string(),
    usedOperands: z.array(z.string()),
    results: z.array(rowResultSchema),
  }),
  z.object({
    kind: z.literal("error"),
    id: z.string(),
    error: z.string(),
  }),
]);

const PYTHON_WORKER_SCRIPT = `
import sys
import json
import math
import ast
import itertools
import random
import traceback

MAX_FULL_CORNERS = 6

def collect_names(tree):
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            names.add(node.id)
    return names

def evaluate_request(expression, rows):
    try:
        tree = ast.parse(expression, mode="eval")
    except Exception as e:
        return {"kind": "error", "error": "parse error: {}: {}".format(type(e).__name__, e)}

    names = collect_names(tree)
    used_operands = sorted(n for n in names if n != "math")

    try:
        compiled = compile(tree, "<formula>", "eval")
    except Exception as e:
        return {"kind": "error", "error": "compile error: {}: {}".format(type(e).__name__, e)}

    results = []
    for row_idx, row in enumerate(rows):
        missing = [op for op in used_operands if op not in row]
        if missing:
            results.append({"ok": False, "error": "missing operands: " + ",".join(missing)})
            continue

        if len(used_operands) == 0:
            corners = [{}]
        elif len(used_operands) <= MAX_FULL_CORNERS:
            intervals = [row[op] for op in used_operands]
            corners = [dict(zip(used_operands, combo)) for combo in itertools.product(*intervals)]
        else:
            sys.stderr.write(
                "row {} has {} operands; sampling instead of full corner enumeration\\n".format(
                    row_idx, len(used_operands)
                )
            )
            rng = random.Random(row_idx)
            corners = []
            for _ in range(64):
                corners.append({op: rng.choice(row[op]) for op in used_operands})
            corners.append({op: (row[op][0] + row[op][1]) / 2 for op in used_operands})

        values = []
        error = None
        for corner in corners:
            scope = dict(corner)
            scope["math"] = math
            try:
                v = eval(compiled, {"__builtins__": {}}, scope)
            except Exception as e:
                error = "{}: {}".format(type(e).__name__, e)
                break
            if not isinstance(v, (int, float)) or isinstance(v, bool):
                error = "non-numeric result: {}".format(type(v).__name__)
                break
            fv = float(v)
            if not math.isfinite(fv):
                error = "non-finite result: {}".format(fv)
                break
            values.append(fv)

        if error is not None:
            results.append({"ok": False, "error": error})
        else:
            results.append({"ok": True, "min": min(values), "max": max(values)})

    return {"kind": "ok", "usedOperands": used_operands, "results": results}


def main():
    for line in sys.stdin:
        stripped = line.strip()
        if not stripped:
            continue
        try:
            req = json.loads(stripped)
        except Exception as e:
            sys.stdout.write(json.dumps({
                "kind": "error",
                "id": "",
                "error": "invalid json: {}".format(e)
            }) + "\\n")
            sys.stdout.flush()
            continue

        try:
            response = evaluate_request(req["expression"], req["rows"])
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            response = {"kind": "error", "error": "{}: {}".format(type(e).__name__, e)}

        response["id"] = req.get("id", "")
        sys.stdout.write(json.dumps(response) + "\\n")
        sys.stdout.flush()


main()
`;

type PendingRequest = {
  resolve: (value: EvaluateResult) => void;
  reject: (error: Error) => void;
};

export class PythonRunner {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<string, PendingRequest>();
  private shuttingDown = false;
  private exited = false;

  private constructor(process: ChildProcessWithoutNullStreams) {
    this.process = process;
  }

  static async start(): Promise<PythonRunner> {
    const proc = spawn("python3", ["-u", "-c", PYTHON_WORKER_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const runner = new PythonRunner(proc);

    const stdout = readline.createInterface({ input: proc.stdout });
    stdout.on("line", (line) => {
      runner.handleResponseLine(line);
    });

    const stderr = readline.createInterface({ input: proc.stderr });
    stderr.on("line", (line) => {
      logger.warn(`[pythonRunner] ${line}`);
    });

    proc.on("exit", (code, signal) => {
      runner.exited = true;
      if (!runner.shuttingDown) {
        logger.error(
          `[pythonRunner] python3 exited unexpectedly: code=${code} signal=${signal}`,
        );
      }
      const exitError = new Error(
        `python3 exited (code=${code}, signal=${signal})`,
      );
      for (const pending of runner.pending.values()) {
        pending.reject(exitError);
      }
      runner.pending.clear();
    });

    proc.on("error", (err) => {
      logger.error(`[pythonRunner] spawn error: ${err.message}`);
    });

    logger.info(`[pythonRunner] spawned python3 worker (pid=${proc.pid})`);
    return runner;
  }

  private handleResponseLine(line: string): void {
    if (!line.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      logger.error(`[pythonRunner] invalid JSON from worker: ${line}`);
      return;
    }

    const result = responseSchema.safeParse(parsed);
    if (!result.success) {
      logger.error(
        `[pythonRunner] malformed response: ${result.error.message} line=${line}`,
      );
      return;
    }

    const response = result.data;
    const pending = this.pending.get(response.id);
    if (!pending) {
      logger.warn(`[pythonRunner] response for unknown id: ${response.id}`);
      return;
    }
    this.pending.delete(response.id);

    if (response.kind === "error") {
      pending.reject(new Error(response.error));
      return;
    }

    pending.resolve({
      usedOperands: response.usedOperands,
      results: response.results,
    });
  }

  async evaluate(
    expression: string,
    rows: RowIntervals[],
  ): Promise<EvaluateResult> {
    if (this.exited) {
      throw new Error("python3 worker has exited");
    }
    if (this.shuttingDown) {
      throw new Error("python3 worker is shutting down");
    }

    const id = randomUUID();
    const payload = JSON.stringify({ id, expression, rows });

    return new Promise<EvaluateResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process.stdin.write(payload + "\n", (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    if (this.exited) return;

    this.process.stdin.end();

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!this.exited) {
          this.process.kill("SIGKILL");
        }
        resolve();
      }, 2000);
      this.process.on("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
