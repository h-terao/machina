import type { MutexConfig, ResolvedMutexConfig } from "./schema";

export const resolveMutexConfig = async (
  stepId: string,
  mutexConfig: MutexConfig,
  enableMutexByDefault: boolean = false,
): Promise<ResolvedMutexConfig> => {
  if (mutexConfig === undefined) {
    return enableMutexByDefault
      ? { enabled: true, id: `mutex.${stepId}` }
      : { enabled: false };
  }

  if (typeof mutexConfig === "boolean") {
    return mutexConfig
      ? { enabled: true, id: `mutex.${stepId}` }
      : { enabled: false };
  }

  if (typeof mutexConfig === "string") {
    return { enabled: true, id: mutexConfig };
  }

  return mutexConfig;
};
