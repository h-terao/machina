import type { ResolvedWorkflowConfig } from "@/config";
import { defineMiddleware } from "./middleware";
import { defineStep } from "./step";
import type { Context, Middleware, MutexManager, Workflow } from "./types";

const TERMINAL_STEPS = ["COMPLETE", "ABORT"] as const;

const isTerminal = (stepId: string): boolean => {
  return TERMINAL_STEPS.includes(stepId as (typeof TERMINAL_STEPS)[number]);
};

export const defineWorkflow = (config: ResolvedWorkflowConfig): Workflow => {
  const steps = Object.fromEntries(
    Object.entries(config.steps).map(([name, stepConfig]) => [
      name,
      defineStep(stepConfig),
    ]),
  );

  const middlewares = Object.fromEntries(
    Object.entries(config.middlewares).map(([name, middlewareConfig]) => [
      name,
      defineMiddleware(middlewareConfig),
    ]),
  );

  return {
    initStep: config.initStep,
    steps,
    middlewares,
  };
};

const applyMiddlewares = async (
  middlewares: Record<string, Middleware>,
  ctx: Context,
  pickToApply: (
    id: string,
    middleware: Middleware,
  ) => (ctx: Context) => Promise<Context>,
) => {
  let updated = ctx;
  // TODO: sort.
  for (const [middlewareId, middleware] of Object.entries(middlewares)) {
    const toApply = pickToApply(middlewareId, middleware);
    updated = await toApply(updated);
  }
  return updated;
};

export const runWorkflow = async (
  workflow: Workflow,
  ctx: Context,
  mutexManager: MutexManager,
): Promise<Context> => {
  const { steps, middlewares } = workflow;
  let stepId = workflow.initStep;

  ctx = await applyMiddlewares(
    middlewares,
    ctx,
    (id, m) => (c) => m.handler.onWorkflowStart(c, id),
  );

  while (!isTerminal(stepId)) {
    const step = steps[stepId];
    if (!step) {
      throw new Error(`Step "${stepId}" is not defined.`);
    }

    const releaseMutex = step.mutex.enabled
      ? await mutexManager.acquire(step.mutex.id)
      : undefined;

    try {
      ctx = await applyMiddlewares(
        middlewares,
        ctx,
        (id, m) => (c) =>
          m.applyTo === undefined || m.applyTo.includes(stepId)
            ? m.handler.onStepStart(c, id, stepId)
            : Promise.resolve(c),
      );

      const [status, newCtx] = await step.action.apply(ctx, stepId);
      const newStepId = await step.transitions.reduce(
        async (acc, transition) => {
          if (await transition.cond(status, newCtx, stepId)) {
            return transition.next;
          }
          return acc;
        },
        Promise.resolve<string | null>(null),
      );
      if (!newStepId) {
        throw new Error(
          `No transition condition is satisfied for step "${stepId}".`,
        );
      }

      ctx = await applyMiddlewares(
        middlewares,
        newCtx,
        (id, m) => (c) =>
          m.applyTo === undefined || m.applyTo.includes(stepId)
            ? m.handler.onStepEnd(c, id, stepId)
            : Promise.resolve(c),
      );

      stepId = newStepId;
      ctx = newCtx;
    } finally {
      if (releaseMutex) releaseMutex();
    }
  }

  ctx = await applyMiddlewares(
    middlewares,
    ctx,
    (id, m) => (c) => m.handler.onWorkflowEnd(c, id),
  );

  return ctx;
};
