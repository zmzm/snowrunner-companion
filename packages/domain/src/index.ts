/** Values cannot be treated as known when source data is missing. */
export type SourcedValue<T> =
  | { status: 'known'; value: T; sourceId: string }
  | { status: 'unknown'; reason: string }
  | { status: 'conflict'; reason: string; sourceIds: readonly string[] };

/** Stable normalized identifier; no source-specific encoding is required. */
export type TruckId = string;

export type {
  Availability,
  CargoBed,
  Component,
  ComponentKind,
  DrivetrainMode,
  Requirement,
  Truck,
  TruckBuild,
  TruckSocket,
  Unlock,
} from './entities';
