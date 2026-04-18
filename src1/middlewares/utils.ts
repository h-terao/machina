import type { z } from "zod";

export const parseConfig = async <T>(path: string, schema: z.ZodType<T>) => {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext || !["json", "json5", "yaml", "yml", "toml"].includes(ext)) {
    throw new Error(`Unsupported config file extension: ${ext}`);
  }

  const config = await import(path);
  return schema.parse(config);
};
