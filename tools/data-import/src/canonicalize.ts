export function canonicalizeId(sourceName: string): string {
  return sourceName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function componentId(kind: string, sourceName: string): string {
  return `${kind}:${canonicalizeId(sourceName)}`;
}
