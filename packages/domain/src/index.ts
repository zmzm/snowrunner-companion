/** Values cannot be treated as known when source data is missing. */
export type SourcedValue<T> =
  | { status: 'known'; value: T; sourceId: string }
  | { status: 'unknown'; reason: string }
  | { status: 'conflict'; reason: string; sourceIds: readonly string[] };

/** Initial identifiers only; entity schemas and compatibility rules are future work. */
export type TruckId = string;
