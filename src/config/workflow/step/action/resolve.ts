import { parseConfig } from "@/config/utils";
import { mergeObjects, resolvePath } from "@/utils";
import type { ActionConfig, ResolvedActionConfig } from "./schema";
import {
  ActionConfigSchema,
  ExternalActionConfigSchema,
  InlineActionConfigSchema,
} from "./schema";

export const resolveActionConfig = async (
  actionConfig: ActionConfig,
  basePath: string,
): Promise<ResolvedActionConfig> => {
  const parsedAsExternal = ExternalActionConfigSchema.safeParse(actionConfig);
  if (!parsedAsExternal.success) {
    // If not an external config, it must be an inline config.
    return InlineActionConfigSchema.parse(actionConfig);
  }

  const { include, overrides } = parsedAsExternal.data;
  const resolvedPath = resolvePath(basePath, include);
  const externalConfig = await resolveActionConfig(
    await parseConfig(resolvedPath, ActionConfigSchema),
    resolvedPath,
  );
  const overriddenParams = mergeObjects(externalConfig.params, overrides);
  return { ...externalConfig, params: overriddenParams };
};
