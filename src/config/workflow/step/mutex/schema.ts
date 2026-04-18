import { z } from "zod";

const MutexSchema = z.union([
  z.object({ enabled: z.literal(false) }),
  z.object({ enabled: z.literal(true), id: z.string() }),
]);

export const MutexConfigSchema = z
  .union([z.boolean(), z.string(), MutexSchema])
  .optional();
export const ResolvedMutexConfigSchema = MutexSchema;

export type MutexConfig = z.infer<typeof MutexConfigSchema>;
export type ResolvedMutexConfig = z.infer<typeof ResolvedMutexConfigSchema>;
