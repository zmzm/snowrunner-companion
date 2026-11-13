import type { SourcedValue, TruckId } from './index';

export type ComponentKind =
  'engine' | 'gearbox' | 'suspension' | 'wheels' | 'winch' | 'addon';

export type Unlock =
  | { kind: 'available' }
  | { kind: 'rank'; rank: number }
  | { kind: 'exploration'; regionId: string };

export interface Availability {
  unlock: SourcedValue<Unlock>;
  /** Empty means base game only when explicitly known. */
  dlcIds: SourcedValue<readonly string[]>;
}

export type DrivetrainMode = 'unavailable' | 'switchable' | 'always-on';
export type CargoBed =
  | { kind: 'fixed'; cargoSlots: number }
  | { kind: 'addon'; socketId: string }
  | { kind: 'none' };

export interface Truck {
  id: TruckId;
  name: string;
  availability: Availability;
  drivetrain: {
    awd: SourcedValue<DrivetrainMode>;
    differentialLock: SourcedValue<DrivetrainMode>;
  };
  bed: SourcedValue<CargoBed>;
  /** Evidence may be incomplete; [] must not stand for missing evidence. */
  sockets: SourcedValue<readonly TruckSocket[]>;
}

export interface TruckSocket {
  id: string;
  kind: ComponentKind;
  compatibleComponentIds: SourcedValue<readonly string[]>;
  defaultComponentId: SourcedValue<string | null>;
  excludedComponentIds: SourcedValue<readonly string[]>;
}

interface ComponentBase {
  id: string;
  name: string;
  availability: Availability;
}

export type Component = ComponentBase &
  (
    | { kind: 'engine'; torqueNm: SourcedValue<number> }
    | { kind: 'gearbox'; gears: SourcedValue<number> }
    | { kind: 'suspension'; liftMm: SourcedValue<number> }
    | {
        kind: 'wheels';
        diameterInches: SourcedValue<number>;
        /** IDs are truck-specific; unknown means fitment is unresolved. */
        requiredSuspensionIds: SourcedValue<readonly string[]>;
      }
    | { kind: 'winch'; autonomous: SourcedValue<boolean> }
    | {
        kind: 'addon';
        cargoSlots: SourcedValue<number>;
        equipment: SourcedValue<readonly string[]>;
      }
  );

/** Structural save contract; parsing does not certify build compatibility. */
export interface TruckBuild {
  schemaVersion: 1;
  datasetVersion: string;
  id: string;
  name: string;
  truckId: TruckId;
  selections: readonly { socketId: string; componentId: string }[];
}

/** Trailer requirements are separate from on-truck capacity. */
export type Requirement =
  | { kind: 'cargo'; location: 'on-truck' | 'trailer'; minimumSlots: number }
  | { kind: 'equipment'; equipmentId: string }
  | { kind: 'awd'; required: boolean }
  | { kind: 'terrain'; terrainId: string };
