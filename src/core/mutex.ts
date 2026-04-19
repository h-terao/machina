import type { MutexManager, ReleaseMutex } from "./types";

export const defineMutexManager = (): MutexManager => {
  const locks = new Map<string, Promise<void>>();

  const acquire = async (id: string): Promise<ReleaseMutex> => {
    // Wait for the current lock holder to finish
    while (locks.has(id)) {
      await locks.get(id);
    }

    let release!: ReleaseMutex;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(id, promise);

    return () => {
      locks.delete(id);
      release();
    };
  };

  return { acquire };
};
