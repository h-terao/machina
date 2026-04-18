export type Data = Record<string, unknown>;
export type StepState = Record<string, unknown>;
export type MiddlewareState = Record<string, unknown>;
export type Status = { code: string };
export type Isolation = "worktree" | "shared";

export interface Context {
  id: string;
  data: Data;
  stepStates: Record<string, StepState>;
  middlewareStates: Record<string, MiddlewareState>;
}

export interface Action {
  init: () => Promise<StepState>;
  execute: (
    ctx: Context,
    stepId: string,
  ) => Promise<{ status: Status; ctx: Context }>;
}

export interface Transition {
  cond: (status: Status, ctx: Context, stepId: string) => Promise<boolean>;
  next: string;
}

export interface Middleware {
  init: () => Promise<MiddlewareState>;
  onWorkflowStart?: (ctx: Context, middlewareId: string) => Promise<Context>;
  onWorkflowEnd?: (ctx: Context, middlewareId: string) => Promise<Context>;
  onStepStart?: (
    ctx: Context,
    stepId: string,
    middlewareId: string,
  ) => Promise<Context>;
  onStepEnd?: (
    ctx: Context,
    stepId: string,
    middlewareId: string,
  ) => Promise<Context>;
}
