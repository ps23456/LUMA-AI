/**
 * Deep-update a layout by path.
 * Path format: "sections.2.props.body" | "theme.accentColor" | "sections.1.props.products.0.price"
 */
export function updateLayoutByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const parts = path.split(".");
  if (parts.length === 0) return obj;

  const result = JSON.parse(JSON.stringify(obj)) as T;

  let current: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const isArrayIndex = /^\d+$/.test(nextKey);
    const next = current[key];
    if (next === undefined || next === null) {
      current[key] = isArrayIndex ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = parts[parts.length - 1];
  current[lastKey] = value;
  return result;
}
