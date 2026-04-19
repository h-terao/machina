import { z } from "zod";

export const SettingsSchema = z.object({
  port: z.number().optional().default(3000),
  mutex: z.boolean().optional().default(false),
  concurrency: z.number().positive().optional().default(1),
});

export type Settings = z.infer<typeof SettingsSchema>;
