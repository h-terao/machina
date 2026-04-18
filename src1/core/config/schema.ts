import { z } from "zod";

export const TerminalSchema = z.enum(["COMPLETE", "ABORT"]);
export const IsolationSchema = z.enum(["shared", "worktree"]);

export const InlineActionSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

/** Reference action from an external file */
export const ActionReferenceSchema = z.union([
  z.object({
    include: z.string(),
    overrides: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  z.string().transform((s) => ({
    include: s,
    overrides: {} as Record<string, unknown>,
  })),
]);

export const ActionSchema = z.union([
  InlineActionSchema,
  ActionReferenceSchema,
]);

export const TransitionSchema = z.object({
  cond: z.string().optional(),
  next: z.string(),
});

export const StepSchema = z.object({
  action: ActionSchema,
  transitions: z
    .array(TransitionSchema)
    .nonempty({ message: "A step must have at least one transition." }),
  isolation: IsolationSchema.optional(),
});

export const InlineMiddlewareSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const MiddlewareReferenceSchema = z.union([
  z.object({
    include: z.string(),
    overrides: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  z.string().transform((s) => ({
    include: s,
    overrides: {} as Record<string, unknown>,
  })),
]);

export const MiddlewareSchema = z.union([
  InlineMiddlewareSchema,
  MiddlewareReferenceSchema,
]);

export const WorkflowSchema = z
  .object({
    id: z.string().optional(),
    init_step: z.string(),
    steps: z.record(z.string(), StepSchema),
    middlewares: z.record(z.string(), MiddlewareSchema).optional().default({}),
  })
  .refine((data) => data.init_step in data.steps, {
    message: "init_step must reference a key in steps",
    path: ["init_step"],
  })
  .refine(
    (data) =>
      Object.keys(data.steps).every(
        (key) => !TerminalSchema.safeParse(key).success,
      ),
    {
      message: "step key must not be a terminal name (COMPLETE, ABORT)",
      path: ["steps"],
    },
  )
  .refine(
    (data) => {
      const stepKeys = new Set(Object.keys(data.steps));
      return Object.values(data.steps).every((step) =>
        step.transitions.every(
          (t) =>
            stepKeys.has(t.next) || TerminalSchema.safeParse(t.next).success,
        ),
      );
    },
    {
      message:
        "transition next must reference a step key or terminal (COMPLETE, ABORT)",
      path: ["steps"],
    },
  );

export const ResolvedWorkflowSchema = WorkflowSchema.extend({
  steps: z.record(
    z.string(),
    StepSchema.extend({ action: InlineActionSchema }),
  ),
  middlewares: z
    .record(z.string(), InlineMiddlewareSchema)
    .optional()
    .default({}),
});
