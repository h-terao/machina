import type { Settings } from "@/config";
import { defineMutexManager } from "./mutex";
import type { Context, ReleaseMutex, Workflow } from "./types";
import { runWorkflow } from "./workflow";

export const defineSemaphore = (count: number) => {
  let available = count;
  const waiters: Array<(release: ReleaseMutex) => void> = [];

  const release = () => {
    const next = waiters.shift();
    if (next) {
      next(release);
    } else {
      available++;
    }
  };

  return {
    acquire: (): Promise<ReleaseMutex> => {
      if (available > 0) {
        available--;
        return Promise.resolve(release);
      }
      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },
  };
};

export const defineEngine = (settings: Settings) => {
  const mutexManager = defineMutexManager();
  const semaphore = defineSemaphore(settings.concurrency);

  return {
    enqueue: async (workflow: Workflow, ctx: Context): Promise<Context> => {
      const release = await semaphore.acquire();
      try {
        return await runWorkflow(workflow, ctx, mutexManager);
      } finally {
        release();
      }
    },
  };
};
