import { parseConfig } from "@/core/utils";
import { Workflow } from "./schema";

export const parseWorkflow = async (path: string) => {
  const workflowConfig = await parseConfig(path, Workflow);
};
