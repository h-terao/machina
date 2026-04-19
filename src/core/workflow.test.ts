import { describe, expect, mock, test } from "bun:test";
import { defineContext } from "./context";
import { defineMutexManager } from "./mutex";
import type { Context, Middleware, Step, Workflow } from "./types";
import { runWorkflow } from "./workflow";

const makeContext = (overrides?: Partial<Context>): Context => ({
  id: "test",
  cwd: "/tmp",
  data: {},
  stepStates: {},
  middlewareStates: {},
  ...overrides,
});

const makeStep = (
  action: (
    ctx: Context,
    stepId: string,
  ) => Promise<[{ code: string }, Context]>,
  next: string,
  mutex?: { enabled: true; id: string } | { enabled: false },
): Step => ({
  mutex: mutex?.enabled ? { enabled: true, id: mutex.id } : { enabled: false },
  action: {
    init: async () => ({}),
    apply: action,
  },
  transitions: [{ cond: async () => true, next }],
});

const makeTrackingMiddleware = (
  order: string[],
  label: string,
): Middleware => ({
  handler: {
    init: async () => ({}),
    onWorkflowStart: async (ctx) => ctx,
    onWorkflowEnd: async (ctx) => ctx,
    onStepStart: async (ctx) => {
      order.push(`${label}-onStepStart`);
      return ctx;
    },
    onStepEnd: async (ctx) => {
      order.push(`${label}-onStepEnd`);
      return ctx;
    },
  },
  applyTo: undefined,
});

describe("defineContext", () => {
  const makeWorkflow = (
    stepInits: Record<string, () => Promise<Record<string, unknown>>>,
    middlewareInits: Record<string, () => Promise<Record<string, unknown>>>,
  ): Workflow => ({
    initStep: Object.keys(stepInits)[0] ?? "step1",
    steps: Object.fromEntries(
      Object.entries(stepInits).map(([name, init]) => [
        name,
        {
          mutex: { enabled: false },
          action: {
            init,
            apply: async (ctx: Context) =>
              [{ code: "ok" }, ctx] as [{ code: string }, Context],
          },
          transitions: [{ cond: async () => true, next: "COMPLETE" }],
        },
      ]),
    ),
    middlewares: Object.fromEntries(
      Object.entries(middlewareInits).map(([name, init]) => [
        name,
        {
          handler: {
            init,
            onWorkflowStart: async (ctx: Context) => ctx,
            onWorkflowEnd: async (ctx: Context) => ctx,
            onStepStart: async (ctx: Context) => ctx,
            onStepEnd: async (ctx: Context) => ctx,
          },
          applyTo: undefined,
        },
      ]),
    ),
  });

  test("calls action.init for each step and handler.init for each middleware", async () => {
    const stepInit = mock(() => Promise.resolve({ count: 0 }));
    const mwInit = mock(() => Promise.resolve({ log: [] }));
    const workflow = makeWorkflow(
      { step1: stepInit, step2: stepInit },
      { mw1: mwInit },
    );

    const ctx = await defineContext(workflow);

    expect(stepInit).toHaveBeenCalledTimes(2);
    expect(mwInit).toHaveBeenCalledTimes(1);
    expect(ctx.stepStates).toEqual({
      step1: { count: 0 },
      step2: { count: 0 },
    });
    expect(ctx.middlewareStates).toEqual({ mw1: { log: [] } });
  });

  test("uses defaults when no params provided", async () => {
    const workflow = makeWorkflow({ s: async () => ({}) }, {});

    const ctx = await defineContext(workflow);

    expect(ctx.id).toBeString();
    expect(ctx.id.length).toBeGreaterThan(0);
    expect(ctx.cwd).toBe(process.cwd());
    expect(ctx.data).toEqual({});
  });

  test("allows overriding id, cwd, and data", async () => {
    const workflow = makeWorkflow({ s: async () => ({}) }, {});

    const ctx = await defineContext(workflow, {
      id: "custom-id",
      cwd: "/custom",
      data: { key: "value" },
    });

    expect(ctx.id).toBe("custom-id");
    expect(ctx.cwd).toBe("/custom");
    expect(ctx.data).toEqual({ key: "value" });
  });

  test("allows partial override", async () => {
    const workflow = makeWorkflow({ s: async () => ({}) }, {});

    const ctx = await defineContext(workflow, { id: "my-id" });

    expect(ctx.id).toBe("my-id");
    expect(ctx.cwd).toBe(process.cwd());
    expect(ctx.data).toEqual({});
  });
});

describe("runWorkflow with mutex", () => {
  test("same mutex id serializes step execution across concurrent workflows", async () => {
    const order: string[] = [];
    const mutexManager = defineMutexManager();

    const makeWf = (runnerId: string): Workflow => ({
      initStep: "step1",
      steps: {
        step1: makeStep(
          async (ctx) => {
            order.push(`${runnerId}-action`);
            await new Promise((r) =>
              setTimeout(r, runnerId === "r1" ? 50 : 10),
            );
            return [{ code: "ok" }, ctx];
          },
          "COMPLETE",
          { enabled: true, id: "shared-mutex" },
        ),
      },
      middlewares: {},
    });

    await Promise.all([
      runWorkflow(makeWf("r1"), makeContext(), mutexManager),
      runWorkflow(makeWf("r2"), makeContext(), mutexManager),
    ]);

    expect(order).toEqual(["r1-action", "r2-action"]);
  });

  test("different mutex ids allow concurrent execution", async () => {
    const order: string[] = [];
    const mutexManager = defineMutexManager();

    const makeWf = (runnerId: string, mutexId: string): Workflow => ({
      initStep: "step1",
      steps: {
        step1: makeStep(
          async (ctx) => {
            order.push(`${runnerId}-start`);
            await new Promise((r) =>
              setTimeout(r, runnerId === "r1" ? 50 : 10),
            );
            order.push(`${runnerId}-end`);
            return [{ code: "ok" }, ctx];
          },
          "COMPLETE",
          { enabled: true, id: mutexId },
        ),
      },
      middlewares: {},
    });

    await Promise.all([
      runWorkflow(makeWf("r1", "id-a"), makeContext(), mutexManager),
      runWorkflow(makeWf("r2", "id-b"), makeContext(), mutexManager),
    ]);

    expect(order).toEqual(["r1-start", "r2-start", "r2-end", "r1-end"]);
  });

  test("mutex disabled runs concurrently", async () => {
    const order: string[] = [];
    const mutexManager = defineMutexManager();

    const makeWf = (runnerId: string): Workflow => ({
      initStep: "step1",
      steps: {
        step1: makeStep(
          async (ctx) => {
            order.push(`${runnerId}-start`);
            await new Promise((r) =>
              setTimeout(r, runnerId === "r1" ? 50 : 10),
            );
            order.push(`${runnerId}-end`);
            return [{ code: "ok" }, ctx];
          },
          "COMPLETE",
          { enabled: false },
        ),
      },
      middlewares: {},
    });

    await Promise.all([
      runWorkflow(makeWf("r1"), makeContext(), mutexManager),
      runWorkflow(makeWf("r2"), makeContext(), mutexManager),
    ]);

    expect(order).toEqual(["r1-start", "r2-start", "r2-end", "r1-end"]);
  });

  test("mutex scope includes onStepStart and onStepEnd middlewares", async () => {
    const order: string[] = [];
    const mutexManager = defineMutexManager();

    const makeWf = (runnerId: string): Workflow => ({
      initStep: "step1",
      steps: {
        step1: makeStep(
          async (ctx) => {
            order.push(`${runnerId}-action`);
            await new Promise((r) =>
              setTimeout(r, runnerId === "r1" ? 50 : 10),
            );
            return [{ code: "ok" }, ctx];
          },
          "COMPLETE",
          { enabled: true, id: "shared" },
        ),
      },
      middlewares: { mw: makeTrackingMiddleware(order, runnerId) },
    });

    await Promise.all([
      runWorkflow(makeWf("r1"), makeContext(), mutexManager),
      runWorkflow(makeWf("r2"), makeContext(), mutexManager),
    ]);

    expect(order).toEqual([
      "r1-onStepStart",
      "r1-action",
      "r1-onStepEnd",
      "r2-onStepStart",
      "r2-action",
      "r2-onStepEnd",
    ]);
  });
});
