import { z } from "zod";

export const InlineActionConfigSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

export const ExternalActionConfigSchema = z.union([
  z.object({
    include: z.string(),
    overrides: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  z.string().transform((s) => ({
    include: s,
    overrides: {} as Record<string, unknown>,
  })),
]);

export const ActionConfigSchema = z.union([
  InlineActionConfigSchema,
  ExternalActionConfigSchema,
]);

export const ResolvedActionConfigSchema = InlineActionConfigSchema;

export type InlineActionConfig = z.infer<typeof InlineActionConfigSchema>;
export type ExternalActionConfig = z.infer<typeof ExternalActionConfigSchema>;
export type ActionConfig = z.infer<typeof ActionConfigSchema>;
export type ResolvedActionConfig = z.infer<typeof ResolvedActionConfigSchema>;
