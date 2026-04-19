import vento from "ventojs";
import type {
  ResolvedActionConfig,
  ResolvedMutexConfig,
  ResolvedStepConfig,
  ResolvedTransitionConfig,
} from "@/config";
import { defineRegistry } from "@/utils";
import { getStepState } from "./context";
import type {
  Action,
  Context,
  Mutex,
  Params,
  Status,
  Step,
  Transition,
} from "./types";

const ventoEnv = vento();

export const actionRegistry = defineRegistry<(params: Params) => Action>();

const defineAction = (config: ResolvedActionConfig): Action => {
  const factory = actionRegistry.get(config.type);
  if (!factory) {
    throw new Error(`Action type "${config.type}" is not registered.`);
  }
  return factory(config.params);
};

const defineTransition = (config: ResolvedTransitionConfig): Transition => ({
  cond: async (status: Status, ctx: Context, stepId: string) => {
    if (config.cond === undefined) return true;

    const result = await ventoEnv.runString(`{{ ${config.cond} }}`, {
      ...ctx,
      status,
      state: getStepState(ctx, stepId),
    });
    const output = result.content.trim();
    return output !== "" && output !== "false" && output !== "0";
  },
  next: config.next,
});

// Currently, equal to config, but we define a separate function for future extensibility.
const defineMutex = (config: ResolvedMutexConfig): Mutex =>
  config.enabled ? { enabled: true, id: config.id } : { enabled: false };

export const defineStep = (config: ResolvedStepConfig): Step => ({
  mutex: defineMutex(config.mutex),
  action: defineAction(config.action),
  transitions: config.transitions.map(defineTransition),
});
