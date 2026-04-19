import type { ResolvedHandlerConfig, ResolvedMiddlewareConfig } from "@/config";
import { defineRegistry } from "@/utils";
import type { Handler, Middleware, Params } from "./types";

export const handlerRegistry = defineRegistry<(params: Params) => Handler>();

const defineHandler = (config: ResolvedHandlerConfig): Handler => {
  const factory = handlerRegistry.get(config.type);
  if (!factory) {
    throw new Error(`Handler type "${config.type}" is not registered.`);
  }
  return factory(config.params);
};

export const defineMiddleware = (
  config: ResolvedMiddlewareConfig,
): Middleware => ({
  handler: defineHandler(config.handler),
  applyTo: config.applyTo,
});
