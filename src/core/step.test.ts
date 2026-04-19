import { describe, expect, test } from "bun:test";
import type { ResolvedStepConfig } from "@/config";
import { actionRegistry, defineStep } from "./step";
import type { Context } from "./types";

const makeContext = (overrides?: Partial<Context>): Context => ({
  id: "test",
  cwd: "/tmp",
  data: {},
  stepStates: { s1: { count: 5 } },
  middlewareStates: {},
  ...overrides,
});

const noop = () => ({
  init: async () => ({}),
  apply: async (ctx: Context) =>
    [{ code: "ok" }, ctx] as [{ code: string }, Context],
});

describe("defineTransition cond evaluation", () => {
  actionRegistry.register("noop", noop);

  const makeStepConfig = (
    cond: string | undefined,
    next: string,
  ): ResolvedStepConfig => ({
    mutex: { enabled: false },
    action: { type: "noop", params: {} },
    transitions: [{ cond, next }],
  });

  test("undefined cond is always true", async () => {
    const step = defineStep(makeStepConfig(undefined, "COMPLETE"));
    const result = await step.transitions[0].cond(
      { code: "ok" },
      makeContext(),
      "s1",
    );
    expect(result).toBe(true);
  });

  test("evaluates status.code via vento template", async () => {
    const step = defineStep(
      makeStepConfig('x.status.code === "ok"', "COMPLETE"),
    );
    const result = await step.transitions[0].cond(
      { code: "ok" },
      makeContext(),
      "s1",
    );
    expect(result).toBe(true);
  });

  test("evaluates to false when condition does not match", async () => {
    const step = defineStep(
      makeStepConfig('x.status.code === "error"', "ABORT"),
    );
    const result = await step.transitions[0].cond(
      { code: "ok" },
      makeContext(),
      "s1",
    );
    expect(result).toBe(false);
  });

  test("can access step state via x.state", async () => {
    const step = defineStep(makeStepConfig("x.state.count > 3", "COMPLETE"));
    const result = await step.transitions[0].cond(
      { code: "ok" },
      makeContext(),
      "s1",
    );
    expect(result).toBe(true);
  });

  test("can access context data via x.data", async () => {
    const step = defineStep(makeStepConfig("x.data.flag", "COMPLETE"));
    const ctx = makeContext({ data: { flag: true } });
    const result = await step.transitions[0].cond({ code: "ok" }, ctx, "s1");
    expect(result).toBe(true);
  });

  test("throws when stepId is not found in stepStates", async () => {
    const step = defineStep(
      makeStepConfig('x.status.code === "ok"', "COMPLETE"),
    );
    expect(
      step.transitions[0].cond({ code: "ok" }, makeContext(), "unknown"),
    ).rejects.toThrow();
  });
});
