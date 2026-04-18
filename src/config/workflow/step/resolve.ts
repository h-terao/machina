import {
  type ResolvedMiddlewareConfig,
  resolveMiddlewareConfig,
} from "@/config/workflow/middleware";
import { resolveActionConfig } from "./action";
import { resolveMutexConfig } from "./mutex";
import type { ResolvedStepConfig, StepConfig } from "./schema";
import { resolveTransitionConfig } from "./transition";

export const resolveStepConfig = async (
  stepId: string,
  stepConfig: StepConfig,
  basePath: string,
  enableMutexByDefault: boolean = false,
): Promise<[ResolvedStepConfig, Record<string, ResolvedMiddlewareConfig>]> => {
  // Resolve step; `rest` are already resolved because they don't support external config.
  const { mutex, action, transitions, middlewares, ...rest } = stepConfig;
  const resolvedStepConfig = {
    ...rest,
    mutex: await resolveMutexConfig(stepId, mutex, enableMutexByDefault),
    action: await resolveActionConfig(action, basePath),
    transitions: await Promise.all(
      transitions.map((transition) => resolveTransitionConfig(transition)),
    ),
  };

  // Resolve middlewares. These are separated from the step.
  const resolvedMiddlewareConfigs = Object.fromEntries(
    await Promise.all(
      Object.entries(middlewares).map(
        async ([middlewareId, middlewareConfig]) => {
          const resolvedMiddleware = await resolveMiddlewareConfig(
            // If middlewares are configured in a step, applyTo must not be set
            // and only applied to the step itself.
            { ...middlewareConfig, applyTo: [stepId] },
            basePath,
          );
          return [`${stepId}.${middlewareId}`, resolvedMiddleware];
        },
      ),
    ),
  );

  return [resolvedStepConfig, resolvedMiddlewareConfigs];
};
