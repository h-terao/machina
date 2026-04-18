import { z } from "zod";

export const TransitionConfigSchema = z.object({
  // TODO: Add default value for always True condition.
  cond: z.string().optional(),
  next: z.string(),
});
export const ResolvedTransitionConfigSchema = TransitionConfigSchema;

export type TransitionConfig = z.infer<typeof TransitionConfigSchema>;
export type ResolvedTransitionConfig = z.infer<
  typeof ResolvedTransitionConfigSchema
>;
