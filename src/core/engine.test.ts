import { describe, expect, test } from "bun:test";
import type { Settings } from "@/config";
import { defineEngine, defineSemaphore } from "./engine";
import type { Context, Workflow } from "./types";

const makeContext = (overrides?: Partial<Context>): Context => ({
  id: "test",
  cwd: "/tmp",
  data: {},
  stepStates: {},
  middlewareStates: {},
  ...overrides,
});

const makeDelayWorkflow = (delay: number, onRun: () => void): Workflow => ({
  initStep: "step1",
  steps: {
    step1: {
      mutex: { enabled: false },
      action: {
        init: async () => ({}),
        apply: async (ctx) => {
          onRun();
          await new Promise((r) => setTimeout(r, delay));
          return [{ code: "ok" }, ctx];
        },
      },
      transitions: [{ cond: async () => true, next: "COMPLETE" }],
    },
  },
  middlewares: {},
});

const makeSettings = (concurrency: number): Settings => ({
  port: 3000,
  mutex: false,
  concurrency,
});

describe("defineSemaphore", () => {
  test("acquire returns a release function", async () => {
    const sem = defineSemaphore(1);
    const release = await sem.acquire();
    expect(typeof release).toBe("function");
    release();
  });

  test("allows up to N concurrent acquisitions", async () => {
    const sem = defineSemaphore(2);
    const order: string[] = [];

    const task = async (id: string, delay: number) => {
      const release = await sem.acquire();
      order.push(`${id}-start`);
      await new Promise((r) => setTimeout(r, delay));
      order.push(`${id}-end`);
      release();
    };

    await Promise.all([task("a", 50), task("b", 50), task("c", 10)]);

    // a and b start concurrently, c waits for a slot to free up
    expect(order[0]).toBe("a-start");
    expect(order[1]).toBe("b-start");
    const cStartIdx = order.indexOf("c-start");
    expect(cStartIdx).toBeGreaterThan(1);
    expect(order.slice(2, cStartIdx).some((e) => e.endsWith("-end"))).toBe(
      true,
    );
  });

  test("count=1 serializes execution", async () => {
    const sem = defineSemaphore(1);
    const order: string[] = [];

    const task = async (id: string, delay: number) => {
      const release = await sem.acquire();
      order.push(`${id}-start`);
      await new Promise((r) => setTimeout(r, delay));
      order.push(`${id}-end`);
      release();
    };

    await Promise.all([task("a", 50), task("b", 10)]);
    expect(order).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });
});

describe("defineEngine", () => {
  test("enqueue runs workflow and returns context", async () => {
    const engine = defineEngine(makeSettings(1));
    let ran = false;
    const wf = makeDelayWorkflow(0, () => {
      ran = true;
    });

    const result = await engine.enqueue(wf, makeContext());
    expect(ran).toBe(true);
    expect(result.id).toBe("test");
  });

  test("concurrency=1 serializes execution", async () => {
    const engine = defineEngine(makeSettings(1));
    const order: string[] = [];

    const wf1 = makeDelayWorkflow(50, () => order.push("wf1-start"));
    const wf2 = makeDelayWorkflow(10, () => order.push("wf2-start"));

    await Promise.all([
      engine.enqueue(wf1, makeContext()).then(() => order.push("wf1-done")),
      engine.enqueue(wf2, makeContext()).then(() => order.push("wf2-done")),
    ]);

    // wf1 must finish before wf2 starts
    expect(order).toEqual(["wf1-start", "wf1-done", "wf2-start", "wf2-done"]);
  });

  test("concurrency=2 allows parallel execution", async () => {
    const engine = defineEngine(makeSettings(2));
    const order: string[] = [];

    const wf1 = makeDelayWorkflow(50, () => order.push("wf1-start"));
    const wf2 = makeDelayWorkflow(10, () => order.push("wf2-start"));

    await Promise.all([
      engine.enqueue(wf1, makeContext()).then(() => order.push("wf1-done")),
      engine.enqueue(wf2, makeContext()).then(() => order.push("wf2-done")),
    ]);

    // Both start before either finishes
    expect(order).toEqual(["wf1-start", "wf2-start", "wf2-done", "wf1-done"]);
  });

  test("concurrency=2 with 3 tasks queues the third", async () => {
    const engine = defineEngine(makeSettings(2));
    const order: string[] = [];

    const wf1 = makeDelayWorkflow(50, () => order.push("wf1-start"));
    const wf2 = makeDelayWorkflow(50, () => order.push("wf2-start"));
    const wf3 = makeDelayWorkflow(10, () => order.push("wf3-start"));

    await Promise.all([
      engine.enqueue(wf1, makeContext()).then(() => order.push("wf1-done")),
      engine.enqueue(wf2, makeContext()).then(() => order.push("wf2-done")),
      engine.enqueue(wf3, makeContext()).then(() => order.push("wf3-done")),
    ]);

    // wf1 and wf2 start immediately, wf3 waits for a slot to free up
    expect(order[0]).toBe("wf1-start");
    expect(order[1]).toBe("wf2-start");
    // wf3 starts only after one of wf1/wf2 finishes
    const wf3StartIdx = order.indexOf("wf3-start");
    expect(wf3StartIdx).toBeGreaterThan(1);
    expect(order.slice(2, wf3StartIdx).some((e) => e.endsWith("-done"))).toBe(
      true,
    );
  });
});
