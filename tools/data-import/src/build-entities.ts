import type { Component, Truck } from '@snowrunner/domain';
import type {
  AddonsColumns,
  EnginesColumns,
  GearboxesColumns,
  TrucksColumns,
  WheelsColumns,
} from './manifest';
import { resolveCell, type MergedCandidate } from './candidates';
import { FieldFactory } from './fields';
import type { FieldDisposition, NormalizationReport } from './report';
type Inconsistencies = NormalizationReport['inconsistencies'];

const SOCKETS_REASON =
  'Socket inventory is not derivable from overview sheet data; resolved game XML evidence is required.';
const COMPONENT_AVAILABILITY_REASON =
  'Component availability is not mapped for this source; unlock evidence is unresolved.';

function checkNameDisagreement(
  merged: MergedCandidate,
  file: string,
  inconsistencies: Inconsistencies,
): void {
  if (merged.names.length > 1) {
    inconsistencies.push({
      file,
      rows: merged.names.map((entry) => entry.line),
      field: 'name',
      values: merged.names.map((entry) => entry.value),
      resolution:
        'first appearance kept as the entity name; raw values retained in this report',
    });
  }
}

export function buildTruck(
  merged: MergedCandidate,
  file: string,
  sourceId: string,
  columns: TrucksColumns,
  inconsistencies: Inconsistencies,
): { truck: Truck; fields: Record<string, FieldDisposition> } {
  const factory = new FieldFactory(sourceId, file, merged, inconsistencies);
  checkNameDisagreement(merged, file, inconsistencies);
  const fields: Record<string, FieldDisposition> = {};

  const displayNameEntry = merged.raw.get('displayName')?.[0];
  const name = displayNameEntry?.value ?? merged.names[0]?.value ?? merged.id;
  fields.name = {
    status: 'known',
    detail:
      displayNameEntry !== undefined
        ? `mapped from column "${columns.displayName}" (${file} row ${displayNameEntry.line})`
        : `taken from identity column "${columns.xmlName}" (${file} row ${merged.firstLine})`,
  };

  const unlock = factory.token('unlock', columns.unlock);
  fields.unlock = unlock.disposition;
  const dlcIds = factory.list('dlcIds', columns.dlcIds);
  fields.dlcIds = dlcIds.disposition;
  const awd = factory.token('awd', columns.awd);
  fields.awd = awd.disposition;
  const differentialLock = factory.token(
    'differentialLock',
    columns.differentialLock,
  );
  fields.differentialLock = differentialLock.disposition;

  const bedKind = factory.token('bedKind', columns.bedKind);
  let bed: Truck['bed'];
  if (bedKind.value.status !== 'known') {
    bed = bedKind.value;
    fields.bed = bedKind.disposition;
  } else {
    const token = bedKind.value.value;
    if (token === 'none') {
      bed = factory.known({ kind: 'none' });
      fields.bed = bedKind.disposition;
    } else if (token === 'addon') {
      const socket = resolveCell(merged, 'bedSocketId');
      if (socket.status === 'single') {
        bed = factory.known({ kind: 'addon', socketId: socket.value });
        fields.bed = {
          status: 'known',
          detail: `bed kind "addon" with socket "${socket.value}" from column "${columns.bedSocketId?.column}"`,
        };
      } else if (socket.status === 'disagree') {
        bed = factory.disagree('bedSocketId');
        fields.bed = { status: 'unknown', detail: 'intra-source disagreement' };
      } else {
        bed = factory.unknown(
          'add-on bed indicated but socket evidence is missing',
        );
        fields.bed = { status: 'unknown', detail: 'socket evidence missing' };
      }
    } else {
      const slots = factory.count(
        'bedCargoSlots',
        columns.bedCargoSlots?.column,
        {
          allowZero: true,
        },
      );
      if (slots.value.status === 'known') {
        bed = factory.known({ kind: 'fixed', cargoSlots: slots.value.value });
        fields.bed = {
          status: 'known',
          detail: `${bedKind.disposition.detail}; ${slots.disposition.detail}`,
        };
      } else {
        bed = factory.unknown(
          `fixed bed indicated but cargo slot count unresolved (${slots.value.status === 'unknown' ? slots.value.reason : 'disagreement'})`,
        );
        fields.bed = {
          status: 'unknown',
          detail: `fixed bed, slots unresolved: ${slots.disposition.detail}`,
        };
      }
    }
  }

  fields.sockets = {
    status: 'unknown',
    detail: 'not derivable from this source',
  };

  const truck: Truck = {
    id: merged.id,
    name,
    availability: { unlock: unlock.value, dlcIds: dlcIds.value },
    drivetrain: { awd: awd.value, differentialLock: differentialLock.value },
    bed,
    sockets: factory.unknown(SOCKETS_REASON),
  };
  return { truck, fields };
}

export function buildEngine(
  merged: MergedCandidate,
  file: string,
  sourceId: string,
  columns: EnginesColumns,
  inconsistencies: Inconsistencies,
): { component: Component; fields: Record<string, FieldDisposition> } {
  const factory = new FieldFactory(sourceId, file, merged, inconsistencies);
  checkNameDisagreement(merged, file, inconsistencies);
  const torque = factory.measured('torque', columns.torque, 'N·m');
  return {
    component: {
      id: merged.id,
      name: merged.names[0]?.value ?? merged.id,
      availability: {
        unlock: factory.unknown(COMPONENT_AVAILABILITY_REASON),
        dlcIds: factory.unknown(COMPONENT_AVAILABILITY_REASON),
      },
      kind: 'engine',
      torqueNm: torque.value,
    },
    fields: {
      name: {
        status: 'known',
        detail: `mapped from column "${columns.name}" (${file} row ${merged.firstLine})`,
      },
      availability: { status: 'unknown', detail: 'not mapped for this source' },
      torqueNm: torque.disposition,
    },
  };
}

export function buildGearbox(
  merged: MergedCandidate,
  file: string,
  sourceId: string,
  columns: GearboxesColumns,
  inconsistencies: Inconsistencies,
): { component: Component; fields: Record<string, FieldDisposition> } {
  const factory = new FieldFactory(sourceId, file, merged, inconsistencies);
  checkNameDisagreement(merged, file, inconsistencies);
  const gears = factory.count('gears', columns.gears?.column, {
    allowZero: false,
  });
  return {
    component: {
      id: merged.id,
      name: merged.names[0]?.value ?? merged.id,
      availability: {
        unlock: factory.unknown(COMPONENT_AVAILABILITY_REASON),
        dlcIds: factory.unknown(COMPONENT_AVAILABILITY_REASON),
      },
      kind: 'gearbox',
      gears: gears.value,
    },
    fields: {
      name: {
        status: 'known',
        detail: `mapped from column "${columns.name}" (${file} row ${merged.firstLine})`,
      },
      availability: { status: 'unknown', detail: 'not mapped for this source' },
      gears: gears.disposition,
    },
  };
}

export function buildWheels(
  merged: MergedCandidate,
  file: string,
  sourceId: string,
  columns: WheelsColumns,
  inconsistencies: Inconsistencies,
): { component: Component; fields: Record<string, FieldDisposition> } {
  const factory = new FieldFactory(sourceId, file, merged, inconsistencies);
  checkNameDisagreement(merged, file, inconsistencies);
  const diameter = factory.measured('diameter', columns.diameter, 'inches');
  return {
    component: {
      id: merged.id,
      name: merged.names[0]?.value ?? merged.id,
      availability: {
        unlock: factory.unknown(COMPONENT_AVAILABILITY_REASON),
        dlcIds: factory.unknown(COMPONENT_AVAILABILITY_REASON),
      },
      kind: 'wheels',
      diameterInches: diameter.value,
      requiredSuspensionIds: factory.unknown(
        'wheel/suspension prerequisites are not derivable from this source',
      ),
    },
    fields: {
      name: {
        status: 'known',
        detail: `mapped from column "${columns.name}" (${file} row ${merged.firstLine})`,
      },
      availability: { status: 'unknown', detail: 'not mapped for this source' },
      diameterInches: diameter.disposition,
      requiredSuspensionIds: {
        status: 'unknown',
        detail: 'not derivable from this source',
      },
    },
  };
}

export function buildAddon(
  merged: MergedCandidate,
  file: string,
  sourceId: string,
  columns: AddonsColumns,
  inconsistencies: Inconsistencies,
): { component: Component; fields: Record<string, FieldDisposition> } {
  const factory = new FieldFactory(sourceId, file, merged, inconsistencies);
  checkNameDisagreement(merged, file, inconsistencies);
  const cargoSlots = factory.count('cargoSlots', columns.cargoSlots?.column, {
    allowZero: true,
  });
  const equipment = factory.list('equipment', columns.equipment);
  return {
    component: {
      id: merged.id,
      name: merged.names[0]?.value ?? merged.id,
      availability: {
        unlock: factory.unknown(COMPONENT_AVAILABILITY_REASON),
        dlcIds: factory.unknown(COMPONENT_AVAILABILITY_REASON),
      },
      kind: 'addon',
      cargoSlots: cargoSlots.value,
      equipment: equipment.value,
    },
    fields: {
      name: {
        status: 'known',
        detail: `mapped from column "${columns.name}" (${file} row ${merged.firstLine})`,
      },
      availability: { status: 'unknown', detail: 'not mapped for this source' },
      cargoSlots: cargoSlots.disposition,
      equipment: equipment.disposition,
    },
  };
}
