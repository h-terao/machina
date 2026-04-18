import path from "node:path";

/**
 * Resolve a relative path to an absolute path based on a base path.
 *
 * @param basePath The base path to resolve from.
 * @param relativePath The relative path to resolve
 * @returns The resolved absolute path
 */
export const resolvePath = (basePath: string, relativePath: string) => {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(path.dirname(basePath), relativePath);
};

/** Recursively merge two objects. Arrays are inplaced. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

export const mergeObjects = (
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? mergeObjects(baseValue, overrideValue)
        : overrideValue;
  }
  return result;
};
