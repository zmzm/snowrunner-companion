import { z } from 'zod';
import type {
  Availability,
  Component,
  Requirement,
  SourcedValue,
  Truck,
  TruckBuild,
  TruckSocket,
} from '@snowrunner/domain';

const identifier = z.string().trim().min(1);
const count = z.number().int().nonnegative();
const positive = z.number().positive();
const uniqueIds = z
  .array(identifier)
  .refine((ids) => new Set(ids).size === ids.length, 'IDs must be unique');

/** Missing facts must be explicit; no defaults turn missing evidence into facts. */
export function sourcedValueSchema<T>(
  value: z.ZodType<T>,
): z.ZodType<SourcedValue<T>> {
  return z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('known'), value, sourceId: identifier }),
    z.strictObject({ status: z.literal('unknown'), reason: identifier }),
    z.strictObject({
      status: z.literal('conflict'),
      reason: identifier,
      sourceIds: uniqueIds.refine(
        (ids) => ids.length >= 2,
        'A conflict needs at least two distinct sources',
      ),
    }),
  ]);
}

export const availabilitySchema: z.ZodType<Availability> = z.strictObject({
  unlock: sourcedValueSchema(
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('available') }),
      z.strictObject({ kind: z.literal('rank'), rank: count }),
      z.strictObject({ kind: z.literal('exploration'), regionId: identifier }),
    ]),
  ),
  dlcIds: sourcedValueSchema(uniqueIds),
});

export const componentKindSchema = z.enum([
  'engine',
  'gearbox',
  'suspension',
  'wheels',
  'winch',
  'addon',
]);
export const truckSocketSchema: z.ZodType<TruckSocket> = z.strictObject({
  id: identifier,
  kind: componentKindSchema,
  compatibleComponentIds: sourcedValueSchema(uniqueIds),
  defaultComponentId: sourcedValueSchema(identifier.nullable()),
  excludedComponentIds: sourcedValueSchema(uniqueIds),
});

export const truckSchema: z.ZodType<Truck> = z.strictObject({
  id: identifier,
  name: identifier,
  availability: availabilitySchema,
  drivetrain: z.strictObject({
    awd: sourcedValueSchema(z.enum(['unavailable', 'switchable', 'always-on'])),
    differentialLock: sourcedValueSchema(
      z.enum(['unavailable', 'switchable', 'always-on']),
    ),
  }),
  bed: sourcedValueSchema(
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('fixed'), cargoSlots: count }),
      z.strictObject({ kind: z.literal('addon'), socketId: identifier }),
      z.strictObject({ kind: z.literal('none') }),
    ]),
  ),
  sockets: sourcedValueSchema(
    z
      .array(truckSocketSchema)
      .refine(
        (sockets) =>
          new Set(sockets.map((socket) => socket.id)).size === sockets.length,
        'Socket IDs must be unique within a truck',
      ),
  ),
});

const componentBase = {
  id: identifier,
  name: identifier,
  availability: availabilitySchema,
};
export const componentSchema: z.ZodType<Component> = z.discriminatedUnion(
  'kind',
  [
    z.strictObject({
      ...componentBase,
      kind: z.literal('engine'),
      torqueNm: sourcedValueSchema(positive),
    }),
    z.strictObject({
      ...componentBase,
      kind: z.literal('gearbox'),
      gears: sourcedValueSchema(z.number().int().positive()),
    }),
    z.strictObject({
      ...componentBase,
      kind: z.literal('suspension'),
      liftMm: sourcedValueSchema(z.number().nonnegative()),
    }),
    z.strictObject({
      ...componentBase,
      kind: z.literal('wheels'),
      diameterInches: sourcedValueSchema(positive),
      requiredSuspensionIds: sourcedValueSchema(uniqueIds),
    }),
    z.strictObject({
      ...componentBase,
      kind: z.literal('winch'),
      autonomous: sourcedValueSchema(z.boolean()),
    }),
    z.strictObject({
      ...componentBase,
      kind: z.literal('addon'),
      cargoSlots: sourcedValueSchema(count),
      equipment: sourcedValueSchema(uniqueIds),
    }),
  ],
);

export const truckBuildSchema: z.ZodType<TruckBuild> = z.strictObject({
  schemaVersion: z.literal(1),
  datasetVersion: identifier,
  id: identifier,
  name: identifier,
  truckId: identifier,
  selections: z
    .array(z.strictObject({ socketId: identifier, componentId: identifier }))
    .refine(
      (selections) =>
        new Set(selections.map((selection) => selection.socketId)).size ===
        selections.length,
      'A build may select only one component per socket',
    ),
});

export const requirementSchema: z.ZodType<Requirement> = z.discriminatedUnion(
  'kind',
  [
    z.strictObject({
      kind: z.literal('cargo'),
      location: z.enum(['on-truck', 'trailer']),
      minimumSlots: count,
    }),
    z.strictObject({ kind: z.literal('equipment'), equipmentId: identifier }),
    z.strictObject({ kind: z.literal('awd'), required: z.boolean() }),
    z.strictObject({ kind: z.literal('terrain'), terrainId: identifier }),
  ],
);
