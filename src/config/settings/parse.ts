import { parseConfig } from "@/config/utils";
import { type Settings, SettingsSchema } from "./schema";

export const parseSettings = async (path: string): Promise<Settings> => {
  return await parseConfig(path, SettingsSchema);
};
