import type { Settings } from "@/config/settings";
import { parseConfig } from "@/config/utils";
import { resolveWorkflowConfig } from "./resolve";
import { type ResolvedWorkflowConfig, WorkflowConfigSchema } from "./schema";

export const parseWorkflowConfig = async (
  path: string,
  settings: Settings,
): Promise<ResolvedWorkflowConfig> => {
  const workflowConfig = await parseConfig(path, WorkflowConfigSchema);
  return await resolveWorkflowConfig(workflowConfig, path, settings);
};
