import { resolveHandlerConfig } from "./handler";
import type { MiddlewareConfig, ResolvedMiddlewareConfig } from "./schema";

export const resolveMiddlewareConfig = async (
  middlewareConfig: MiddlewareConfig,
  basePath: string,
): Promise<ResolvedMiddlewareConfig> => {
  return {
    ...middlewareConfig,
    handler: await resolveHandlerConfig(middlewareConfig.handler, basePath),
  };
};
