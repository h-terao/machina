import type { z } from "zod";
import {
  ActionReferenceSchema,
  InlineActionSchema,
  ResolvedWorkflowSchema,
  WorkflowSchema,
} from "./schema";

const parseConfig = async <T>(path: string, schema: z.ZodType<T>) => {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext || !["json", "json5", "yaml", "yml", "toml"].includes(ext)) {
    throw new Error(`Unsupported config file extension: ${ext}`);
  }

  const config = await import(path);
  return schema.parse(config);
};

export const parseWorkflowConfig = async (path: string) => {
  const workflowConfig = await parseConfig(path, WorkflowSchema);

  const resolvedSteps = Object.fromEntries(
    Object.entries(workflowConfig.steps).map(([key, step]) => {
      const actionReference = ActionReferenceSchema.safeParse(step.action);
      if (actionReference.success) {
        const { include, overrides } = actionReference.data;
        // include is absolute or relative to the workflow config file
        const actionPath = include.startsWith("/")
          ? include
          : `${path.substring(0, path.lastIndexOf("/"))}/${include}`;
        const actionConfig = parseConfig(actionPath, InlineActionSchema);
        return [key, { ...step, action: { ...actionConfig, ...overrides } }];
      }
      return [key, step];
    }),
  );

  const resolvedMiddlewares = Object.fromEntries(
    Object.entries(workflowConfig.middlewares).map(([key, middleware]) => {
      const middlewareReference = ActionReferenceSchema.safeParse(middleware);
      if (middlewareReference.success) {
        const { include, overrides } = middlewareReference.data;
        // include is absolute or relative to the workflow config file
        const middlewarePath = include.startsWith("/")
          ? include
          : `${path.substring(0, path.lastIndexOf("/"))}/${include}`;
        const middlewareConfig = parseConfig(
          middlewarePath,
          InlineActionSchema,
        );
        return [key, { ...middlewareConfig, ...overrides }];
      }
      return [key, middleware];
    }),
  );

  return ResolvedWorkflowSchema.parse({
    ...workflowConfig,
    steps: resolvedSteps,
    middlewares: resolvedMiddlewares,
  });
};
