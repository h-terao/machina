export type Data = Record<string, unknown>;
export type Params = Record<string, unknown>;
export type StepState = Record<string, unknown>;
export type MiddlewareState = Record<string, unknown>;
export type Status = { code: string };
export type Mutex = { enabled: false } | { enabled: true; id: string };

export type ReleaseMutex = () => void;
export interface MutexManager {
  acquire: (id: string) => Promise<ReleaseMutex>;
}

export interface Context {
  id: string;
  cwd: string;
  data: Data;
  stepStates: Record<string, StepState>;
  middlewareStates: Record<string, MiddlewareState>;
}

export interface Action {
  init: () => Promise<StepState>;
  apply: (ctx: Context, stepId: string) => Promise<[Status, Context]>;
}

export interface Transition {
  cond: (status: Status, ctx: Context, stepId: string) => Promise<boolean>;
  next: string;
}

export interface Step {
  mutex: Mutex;
  action: Action;
  transitions: Transition[];
}

export interface Handler {
  init: () => Promise<MiddlewareState>;
  onWorkflowStart: (ctx: Context, middlewareId: string) => Promise<Context>;
  onWorkflowEnd: (ctx: Context, middlewareId: string) => Promise<Context>;
  onStepStart: (
    ctx: Context,
    middlewareId: string,
    stepId: string,
  ) => Promise<Context>;
  onStepEnd: (
    ctx: Context,
    middlewareId: string,
    stepId: string,
  ) => Promise<Context>;
}

export interface Middleware {
  handler: Handler;
  // If applyTo is undefined, the middleware will be applied to all steps.
  applyTo: string[] | undefined;
}

export interface Workflow {
  initStep: string;
  steps: Record<string, Step>;
  middlewares: Record<string, Middleware>;
}
