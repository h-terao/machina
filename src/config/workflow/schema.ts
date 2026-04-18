import { z } from "zod";
import {
  MiddlewareConfigSchema,
  ResolvedMiddlewareConfigSchema,
} from "./middleware";
import { ResolvedStepConfigSchema, StepConfigSchema } from "./step";

export const WorkflowConfigSchema = z.object({
  initStep: z.string(),
  mutex: z.boolean().optional(),
  steps: z.record(z.string(), StepConfigSchema),
  middlewares: z
    .record(z.string(), MiddlewareConfigSchema)
    .optional()
    .default({}),
});

export const ResolvedWorkflowConfigSchema = z.object({
  initStep: z.string(),
  steps: z.record(z.string(), ResolvedStepConfigSchema),
  middlewares: z
    .record(z.string(), ResolvedMiddlewareConfigSchema)
    .optional()
    .default({}),
});

export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;
export type ResolvedWorkflowConfig = z.infer<
  typeof ResolvedWorkflowConfigSchema
>;
