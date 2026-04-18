import { z } from "zod";
import { MiddlewareConfigSchema } from "../middleware";
import { ActionConfigSchema, ResolvedActionConfigSchema } from "./action";
import { MutexConfigSchema, ResolvedMutexConfigSchema } from "./mutex";
import {
  ResolvedTransitionConfigSchema,
  TransitionConfigSchema,
} from "./transition";

/**
 * NOTE: Step's middlewares should not have `applyTo` because they are applied to only the step.
 */
export const StepConfigSchema = z.object({
  mutex: MutexConfigSchema,
  action: ActionConfigSchema,
  transitions: z.array(TransitionConfigSchema).nonempty(),
  middlewares: z
    .record(z.string(), MiddlewareConfigSchema.omit({ applyTo: true }))
    .optional()
    .default({}),
});

export const ResolvedStepConfigSchema = z.object({
  mutex: ResolvedMutexConfigSchema,
  action: ResolvedActionConfigSchema,
  transitions: z.array(ResolvedTransitionConfigSchema).nonempty(),
});

export type StepConfig = z.infer<typeof StepConfigSchema>;
export type ResolvedStepConfig = z.infer<typeof ResolvedStepConfigSchema>;
