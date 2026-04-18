import { z } from "zod";

export const Terminal = z.union([z.literal("COMPLETE"), z.literal("ABORT")]);
export const Isolation = z.union([z.literal("shared"), z.literal("worktree")]);

// External file would look like:
export const InlineAction = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

/** Reference action from an external file */
export const ActionReference = z.union([
  z.object({
    include: z.string(),
    overrides: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  z.string().transform((s) => ({
    include: s,
    overrides: {} as Record<string, unknown>,
  })),
]);

export const Action = z.union([InlineAction, ActionReference]);

export const Transition = z.object({
  cond: z.string().optional(),
  next: z.string(),
});

export const Step = z.object({
  action: Action,
  transitions: z
    .array(Transition)
    .nonempty({ message: "A step must have at least one transition." }),
  isolation: Isolation.optional(),
});

export const InlineMiddleware = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const MiddlewareReference = z.union([
  z.object({
    include: z.string(),
    overrides: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  z.string().transform((s) => ({
    include: s,
    overrides: {} as Record<string, unknown>,
  })),
]);

export const Middleware = z.union([InlineMiddleware, MiddlewareReference]);

export const Workflow = z
  .object({
    id: z.string().optional(),
    init_step: z.string(),
    steps: z.record(z.string(), Step),
    middlewares: z.array(Middleware).optional().default([]),
  })
  .refine((data) => data.init_step in data.steps, {
    message: "init_step must reference a key in steps",
    path: ["init_step"],
  })
  .refine(
    (data) =>
      Object.keys(data.steps).every((key) => !Terminal.safeParse(key).success),
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
          (t) => stepKeys.has(t.next) || Terminal.safeParse(t.next).success,
        ),
      );
    },
    {
      message:
        "transition next must reference a step key or terminal (COMPLETE, ABORT)",
      path: ["steps"],
    },
  );
