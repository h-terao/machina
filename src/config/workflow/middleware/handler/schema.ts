import { z } from "zod";

export const InlineHandlerConfigSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

export const HandlerConfigReferenceSchema = z.union([
  z.object({
    include: z.string(),
    overrides: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  z.string().transform((s) => ({
    include: s,
    overrides: {} as Record<string, unknown>,
  })),
]);

export const HandlerConfigSchema = z.union([
  InlineHandlerConfigSchema,
  HandlerConfigReferenceSchema,
]);

export const ResolvedHandlerConfigSchema = InlineHandlerConfigSchema;

export type InlineHandlerConfig = z.infer<typeof InlineHandlerConfigSchema>;
export type HandlerConfigReference = z.infer<
  typeof HandlerConfigReferenceSchema
>;
export type HandlerConfig = z.infer<typeof HandlerConfigSchema>;
export type ResolvedHandlerConfig = z.infer<typeof ResolvedHandlerConfigSchema>;
