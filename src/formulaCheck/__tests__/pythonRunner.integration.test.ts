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

  it("evaluates a simple sum at a point scope", async () => {
    const [{ values }] = await runner.evaluateBatch([
      {
        expression: "A + B",
        scopes: [
          { A: 1, B: 2 },
          { A: 3, B: 4 },
        ],
      },
    ]);

    expect(values).toHaveLength(2);
    expect(values[0]).toEqual({ ok: true, value: 3 });
    expect(values[1]).toEqual({ ok: true, value: 7 });
  });

  it("evaluates multiple expressions in one batch", async () => {
    const [r1, r2] = await runner.evaluateBatch([
      { expression: "A + B", scopes: [{ A: 1, B: 2 }] },
      { expression: "A * B", scopes: [{ A: 3, B: 4 }] },
    ]);

    expect(r1.values[0]).toEqual({ ok: true, value: 3 });
    expect(r2.values[0]).toEqual({ ok: true, value: 12 });
  });

  it("exposes the math module", async () => {
    const [{ values }] = await runner.evaluateBatch([
      { expression: "math.sqrt(A)", scopes: [{ A: 16 }] },
    ]);
    expect(values[0]).toEqual({ ok: true, value: 4 });
  });

  it("reports division-by-zero as an error in the values array", async () => {
    const [{ values }] = await runner.evaluateBatch([
      { expression: "A / B", scopes: [{ A: 1, B: 0 }] },
    ]);
    expect(values[0]).toMatchObject({ ok: false });
    if (values[0].ok === false) {
      expect(values[0].error).toContain("ZeroDivisionError");
    }
  });

  it("reports a parse error via a rejected promise", async () => {
    await expect(
      runner.evaluateBatch([{ expression: "A +", scopes: [{ A: 1 }] }]),
    ).rejects.toThrow(/parse error/);
  });

  it("handles an empty scopes array", async () => {
    const [{ values }] = await runner.evaluateBatch([
      { expression: "A + B", scopes: [] },
    ]);
    expect(values).toHaveLength(0);
  });
});
