import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logger } from "../utils/logger";

export type PointScope = Record<string, number>;
export type PointValue =
  | { ok: true; value: number }
  | { ok: false; error: string };
export type BatchItem = { expression: string; scopes: PointScope[] };
export type BatchResult = { values: PointValue[] };

const pointValueSchema: z.ZodType<PointValue> = z.union([
  z.object({ ok: z.literal(true), value: z.number() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const responseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ok"),
    id: z.string(),
    results: z.array(z.object({ values: z.array(pointValueSchema) })),
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
import traceback

def evaluate_item(expression, scopes):
    try:
        tree = ast.parse(expression, mode="eval")
    except Exception as e:
        return {"kind": "error", "error": "parse error: {}: {}".format(type(e).__name__, e)}

    try:
        compiled = compile(tree, "<formula>", "eval")
    except Exception as e:
        return {"kind": "error", "error": "compile error: {}: {}".format(type(e).__name__, e)}

    values = []
    for scope in scopes:
        s = dict(scope)
        s["math"] = math
        try:
            v = eval(compiled, {"__builtins__": {}}, s)
        except Exception as e:
            values.append({"ok": False, "error": "{}: {}".format(type(e).__name__, e)})
            continue
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            values.append({"ok": False, "error": "non-numeric result: {}".format(type(v).__name__)})
            continue
        fv = float(v)
        if not math.isfinite(fv):
            values.append({"ok": False, "error": "non-finite result: {}".format(fv)})
            continue
        values.append({"ok": True, "value": fv})

    return {"kind": "ok", "values": values}


def handle_request(req):
    results = []
    for item in req["items"]:
        result = evaluate_item(item["expression"], item["scopes"])
        if result["kind"] == "error":
            return result
        results.append({"values": result["values"]})
    return {"kind": "ok", "results": results}


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
            response = handle_request(req)
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            response = {"kind": "error", "error": "{}: {}".format(type(e).__name__, e)}

        response["id"] = req.get("id", "")
        sys.stdout.write(json.dumps(response) + "\\n")
        sys.stdout.flush()


main()
`;

type PendingRequest = {
  resolve: (value: BatchResult[]) => void;
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

    pending.resolve(response.results);
  }

  async evaluateBatch(items: BatchItem[]): Promise<BatchResult[]> {
    if (this.exited) {
      throw new Error("python3 worker has exited");
    }
    if (this.shuttingDown) {
      throw new Error("python3 worker is shutting down");
    }

    const id = randomUUID();
    const payload = JSON.stringify({ id, items });

    return new Promise<BatchResult[]>((resolve, reject) => {
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
