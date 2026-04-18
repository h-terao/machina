import { parseConfig } from "@/config/utils";
import { mergeObjects, resolvePath } from "@/utils";
import type { HandlerConfig, ResolvedHandlerConfig } from "./schema";
import {
  HandlerConfigReferenceSchema,
  HandlerConfigSchema,
  InlineHandlerConfigSchema,
} from "./schema";

export const resolveHandlerConfig = async (
  handlerConfig: HandlerConfig,
  basePath: string,
): Promise<ResolvedHandlerConfig> => {
  const parsedAsReference =
    HandlerConfigReferenceSchema.safeParse(handlerConfig);
  if (!parsedAsReference.success) {
    // If not a reference, it must be an inline config.
    // Inline configs are already resolved, so we can return it as is.
    return InlineHandlerConfigSchema.parse(handlerConfig);
  }

  const { include, overrides } = parsedAsReference.data;
  const resolvedPath = resolvePath(basePath, include);

  // External config can be either an inline or another reference, so we must resolve config recursively.
  const externalConfig = await resolveHandlerConfig(
    await parseConfig(resolvedPath, HandlerConfigSchema),
    resolvedPath,
  );
  const overriddenParams = mergeObjects(externalConfig.params, overrides);
  return { ...externalConfig, params: overriddenParams };
};
