import type { Settings } from "../settings";
import {
  type ResolvedMiddlewareConfig,
  resolveMiddlewareConfig,
} from "./middleware";
import type { WorkflowConfig } from "./schema";
import { type ResolvedStepConfig, resolveStepConfig } from "./step";

export const resolveWorkflowConfig = async (
  workflowConfig: WorkflowConfig,
  basePath: string,
  settings: Settings,
) => {
  const { middlewares, steps, mutex, ...rest } = workflowConfig;

  // Step > Workflow > Settings > false (system default)
  const enableMutexByDefault = mutex ?? settings.mutex ?? false;

  // Resolve middlewares
  const resolvedMiddlewareConfigs: Record<string, ResolvedMiddlewareConfig> =
    Object.fromEntries(
      await Promise.all(
        Object.entries(middlewares).map(
          async ([middlewareId, middlewareConfig]) => {
            const resolvedMiddleware = await resolveMiddlewareConfig(
              middlewareConfig,
              basePath,
            );
            return [middlewareId, resolvedMiddleware];
          },
        ),
      ),
    );

  // Resolve steps.
  const resolvedStepConfigs: Record<string, ResolvedStepConfig> =
    Object.fromEntries(
      await Promise.all(
        Object.entries(steps).map(async ([stepId, stepConfig]) => {
          const [resolvedStepConfig, stepMiddlewareConfigs] =
            await resolveStepConfig(
              stepId,
              stepConfig,
              basePath,
              enableMutexByDefault,
            );

          // Check middleware ID conflicts between workflow and step. This is a safety check, but it should not happen because middlewares are separated into workflow-level and step-level in the config.
          Object.keys(stepMiddlewareConfigs).forEach((middlewareId) => {
            if (resolvedMiddlewareConfigs[middlewareId]) {
              throw new Error(
                `Middleware ID conflict: ${middlewareId} is defined in both workflow and step ${stepId}. Please rename the middleware ID in step ${stepId}.`,
              );
            }
          });
          Object.assign(resolvedMiddlewareConfigs, stepMiddlewareConfigs);

          return [stepId, resolvedStepConfig];
        }),
      ),
    );

  return {
    ...rest,
    steps: resolvedStepConfigs,
    middlewares: resolvedMiddlewareConfigs,
  };
};
