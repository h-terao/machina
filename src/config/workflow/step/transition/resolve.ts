import type { ResolvedTransitionConfig, TransitionConfig } from "./schema";

export const resolveTransitionConfig = async (
  transitionConfig: TransitionConfig,
): Promise<ResolvedTransitionConfig> => {
  return transitionConfig;
};
