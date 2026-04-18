import { z } from "zod";
import { HandlerConfigSchema, ResolvedHandlerConfigSchema } from "./handler";

export const MiddlewareConfigSchema = z.object({
  handler: HandlerConfigSchema,
  applyTo: z.array(z.string()).optional(),
});

export const ResolvedMiddlewareConfigSchema = z.object({
  handler: ResolvedHandlerConfigSchema,
  applyTo: z.array(z.string()).optional(),
});

export type MiddlewareConfig = z.infer<typeof MiddlewareConfigSchema>;
export type ResolvedMiddlewareConfig = z.infer<
  typeof ResolvedMiddlewareConfigSchema
>;
