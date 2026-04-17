import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { PythonRunner } from "../pythonRunner";

function hasPython3(): boolean {
  const result = spawnSync("python3", ["--version"]);
  return result.status === 0;
}

const describeIfPython = hasPython3() ? describe : describe.skip;

describeIfPython("PythonRunner integration", () => {
  let runner: PythonRunner;

  beforeAll(async () => {
    runner = await PythonRunner.start();
  });

  afterAll(async () => {
    await runner.shutdown();
  });

  it("evaluates a simple sum and returns used operands", async () => {
    const { usedOperands, results } = await runner.evaluate("A + B", [
      { A: [1, 1], B: [2, 2] },
      { A: [3, 3], B: [4, 4] },
    ]);

    expect(usedOperands).toEqual(["A", "B"]);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ ok: true, min: 3, max: 3 });
    expect(results[1]).toEqual({ ok: true, min: 7, max: 7 });
  });

  it("produces an interval when operands have non-zero width", async () => {
    const { results } = await runner.evaluate("A * B", [
      { A: [1, 2], B: [3, 4] },
    ]);

    expect(results[0]).toEqual({ ok: true, min: 3, max: 8 });
  });

  it("exposes the math module", async () => {
    const { results } = await runner.evaluate("math.sqrt(A)", [
      { A: [16, 16] },
    ]);
    expect(results[0]).toEqual({ ok: true, min: 4, max: 4 });
  });

  it("reports missing operands as errors", async () => {
    const { results } = await runner.evaluate("A + B", [{ A: [1, 1] }]);
    expect(results[0]).toMatchObject({ ok: false });
    if (results[0].ok === false) {
      expect(results[0].error).toContain("missing operands");
    }
  });

  it("reports division-by-zero as an error", async () => {
    const { results } = await runner.evaluate("A / B", [
      { A: [1, 1], B: [0, 0] },
    ]);
    expect(results[0]).toMatchObject({ ok: false });
    if (results[0].ok === false) {
      expect(results[0].error).toContain("ZeroDivisionError");
    }
  });

  it("reports a parse error via a rejected promise", async () => {
    await expect(runner.evaluate("A +", [{ A: [1, 1] }])).rejects.toThrow(
      /parse error/,
    );
  });
});
