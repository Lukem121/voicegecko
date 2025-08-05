export function isObjectWithBody(value: unknown): value is { body: unknown } {
  return typeof value === 'object' && value !== null && 'body' in value;
}
