import { randomUUID } from "node:crypto";
import { mergeObjects } from "@/utils";
import type {
  Context,
  Data,
  MiddlewareState,
  StepState,
  Workflow,
} from "./types";

export const defineContext = async (
  workflow: Workflow,
  params?: Partial<{ id: string; cwd: string; data: Data }>,
): Promise<Context> => {
  const stepStates = Object.fromEntries(
    await Promise.all(
      Object.entries(workflow.steps).map(async ([name, step]) => [
        name,
        await step.action.init(),
      ]),
    ),
  );
  const middlewareStates = Object.fromEntries(
    await Promise.all(
      Object.entries(workflow.middlewares).map(async ([name, m]) => [
        name,
        await m.handler.init(),
      ]),
    ),
  );
  return {
    id: params?.id ?? randomUUID(),
    cwd: params?.cwd ?? process.cwd(),
    data: params?.data ?? {},
    stepStates,
    middlewareStates,
  };
};

export const updateContextByStep = (
  ctx: Context,
  stepId: string,
  updates: Partial<{ cwd: string; data: Data; stepState: StepState }>,
) => {
  const { cwd = ctx.cwd, data = {}, stepState = {} } = updates;
  const newData = mergeObjects(ctx.data, data);
  const newStepState = mergeObjects(ctx.stepStates, { [stepId]: stepState });
  return { ...ctx, cwd, data: newData, stepStates: newStepState };
};

export const getStepState = (ctx: Context, stepId: string): StepState => {
  const stepState = ctx.stepStates[stepId];
  if (!stepState) {
    throw new Error(`State for step "${stepId}" is not found in context.`);
  }
  return stepState;
};

export const updateContextByMiddleware = (
  ctx: Context,
  middlewareId: string,
  updates: Partial<{
    cwd: string;
    data: Data;
    middlewareState: MiddlewareState;
  }>,
) => {
  const { cwd = ctx.cwd, data = {}, middlewareState = {} } = updates;
  const newData = mergeObjects(ctx.data, data);
  const newMiddlewareState = mergeObjects(ctx.middlewareStates, {
    [middlewareId]: middlewareState,
  });
  return { ...ctx, cwd, data: newData, middlewareStates: newMiddlewareState };
};

export const getMiddlewareState = (
  ctx: Context,
  middlewareId: string,
): MiddlewareState => {
  const middlewareState = ctx.middlewareStates[middlewareId];
  if (!middlewareState) {
    throw new Error(
      `State for middleware "${middlewareId}" is not found in context.`,
    );
  }
  return middlewareState;
};
