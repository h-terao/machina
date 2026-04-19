import { describe, expect, test } from "bun:test";
import { defineMutexManager } from "./mutex";

describe("defineMutexManager", () => {
  test("acquire returns a release function", async () => {
    const manager = defineMutexManager();
    const release = await manager.acquire("test-id");
    expect(typeof release).toBe("function");
    release();
  });

  test("same id serializes execution", async () => {
    const manager = defineMutexManager();
    const order: number[] = [];

    const task = async (id: number, delay: number) => {
      const release = await manager.acquire("same-id");
      try {
        order.push(id);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } finally {
        release();
      }
    };

    // Task 1 takes longer but starts first — it should finish before task 2 starts
    await Promise.all([task(1, 50), task(2, 10)]);
    expect(order).toEqual([1, 2]);
  });

  test("different ids run concurrently", async () => {
    const manager = defineMutexManager();
    const order: string[] = [];

    const task = async (id: string, mutexId: string, delay: number) => {
      const release = await manager.acquire(mutexId);
      try {
        order.push(`${id}-start`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        order.push(`${id}-end`);
      } finally {
        release();
      }
    };

    // Different mutex ids — task2 should start before task1 ends
    await Promise.all([task("t1", "id-a", 50), task("t2", "id-b", 10)]);
    expect(order).toEqual(["t1-start", "t2-start", "t2-end", "t1-end"]);
  });

  test("release allows next waiter to proceed", async () => {
    const manager = defineMutexManager();
    const order: number[] = [];

    const release1 = await manager.acquire("id");
    const task2 = (async () => {
      const release = await manager.acquire("id");
      order.push(2);
      release();
    })();

    order.push(1);
    release1();
    await task2;

    expect(order).toEqual([1, 2]);
  });
});
