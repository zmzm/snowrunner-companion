import { z } from 'zod';
import { provenanceSchema } from '@snowrunner/game-data';

const identifier = z.string().trim().min(1);
const columnName = identifier;
const sha256Version = /^sha256:[0-9a-f]{64}$/;

const unlockValueSchema = z.union([
  z.strictObject({ kind: z.literal('available') }),
  z.strictObject({
    kind: z.literal('rank'),
    rank: z.number().int().nonnegative(),
  }),
  z.strictObject({ kind: z.literal('exploration'), regionId: identifier }),
]);
const drivetrainTokenSchema = z.enum([
  'unavailable',
  'switchable',
  'always-on',
]);
const bedKindTokenSchema = z.enum(['fixed', 'addon', 'none']);

function tokenMap<T extends z.ZodType>(value: T) {
  return z.strictObject({
    column: columnName,
    tokens: z
      .record(z.string().trim().min(1), value)
      .refine(
        (tokens) => Object.keys(tokens).length > 0,
        'At least one token mapping is required',
      ),
  });
}

const plainColumn = z.strictObject({ column: columnName });
const listColumn = z.strictObject({
  column: columnName,
  separator: z.string().min(1).default(','),
});

const torqueColumn = z.strictObject({
  column: columnName,
  unit: z.enum(['N·m', 'unverified']),
});
const diameterColumn = z.strictObject({
  column: columnName,
  unit: z.enum(['inches', 'unverified']),
});

export const trucksColumnsSchema = z.strictObject({
  xmlName: columnName,
  displayName: columnName.optional(),
  unlock: tokenMap(unlockValueSchema).optional(),
  dlcIds: listColumn.optional(),
  awd: tokenMap(drivetrainTokenSchema).optional(),
  differentialLock: tokenMap(drivetrainTokenSchema).optional(),
  bedKind: tokenMap(bedKindTokenSchema).optional(),
  bedCargoSlots: plainColumn.optional(),
  bedSocketId: plainColumn.optional(),
});

export const enginesColumnsSchema = z.strictObject({
  name: columnName,
  torque: torqueColumn.optional(),
});
export const gearboxesColumnsSchema = z.strictObject({
  name: columnName,
  gears: plainColumn.optional(),
});
export const wheelsColumnsSchema = z.strictObject({
  name: columnName,
  diameter: diameterColumn.optional(),
});
export const addonsColumnsSchema = z.strictObject({
  name: columnName,
  cargoSlots: plainColumn.optional(),
  equipment: listColumn.optional(),
});

function fileInput<TColumns extends z.ZodType>(columns: TColumns) {
  return z.strictObject({
    path: identifier,
    sourceId: identifier,
    columns,
  });
}

export const manifestSchema = z
  .strictObject({
    manifestVersion: z.literal(1),
    datasetVersion: identifier,
    sources: z.array(provenanceSchema).min(1),
    trucks: fileInput(trucksColumnsSchema).optional(),
    engines: fileInput(enginesColumnsSchema).optional(),
    gearboxes: fileInput(gearboxesColumnsSchema).optional(),
    wheels: fileInput(wheelsColumnsSchema).optional(),
    addons: fileInput(addonsColumnsSchema).optional(),
  })
  .superRefine((manifest, context) => {
    const tabs = [
      'trucks',
      'engines',
      'gearboxes',
      'wheels',
      'addons',
    ] as const;
    const present = tabs.filter((tab) => manifest[tab] !== undefined);
    if (present.length === 0) {
      context.addIssue({
        code: 'custom',
        path: [],
        message:
          'At least one entity tab (trucks or component table) is required',
      });
    }
    const sourceIds = new Set(
      manifest.sources.map((source) => source.sourceId),
    );
    const usedSourceIds: string[] = [];
    for (const tab of present) {
      const file = manifest[tab];
      if (file === undefined) continue;
      if (!sourceIds.has(file.sourceId)) {
        context.addIssue({
          code: 'custom',
          path: [tab, 'sourceId'],
          message: `Unknown source ID "${file.sourceId}"`,
        });
      }
      usedSourceIds.push(file.sourceId);
    }
    if (new Set(usedSourceIds).size !== usedSourceIds.length) {
      context.addIssue({
        code: 'custom',
        path: [],
        message:
          'Each source must back exactly one file (1:1 file/source mapping)',
      });
    }
    for (const source of manifest.sources) {
      if (!sha256Version.test(source.sourceVersion)) {
        context.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `Source "${source.sourceId}" sourceVersion must be "sha256:<64 lowercase hex>" of the linked file bytes`,
        });
      }
    }
    const used = new Set(usedSourceIds);
    for (const source of manifest.sources) {
      if (!used.has(source.sourceId)) {
        context.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `Source "${source.sourceId}" is not linked to any file`,
        });
      }
    }
  });

export type Manifest = z.infer<typeof manifestSchema>;
export type TrucksColumns = z.infer<typeof trucksColumnsSchema>;
export type EnginesColumns = z.infer<typeof enginesColumnsSchema>;
export type GearboxesColumns = z.infer<typeof gearboxesColumnsSchema>;
export type WheelsColumns = z.infer<typeof wheelsColumnsSchema>;
export type AddonsColumns = z.infer<typeof addonsColumnsSchema>;
export type EntityTab = Exclude<
  keyof Manifest,
  'manifestVersion' | 'datasetVersion' | 'sources'
>;

export class ImportManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportManifestError';
  }
}

export function parseManifest(input: unknown): Manifest {
  const result = manifestSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) =>
        `${issue.path.length > 0 ? issue.path.join('.') : '(manifest)'}: ${issue.message}`,
    );
    throw new ImportManifestError(
      `Invalid import manifest: ${issues.join('; ')}`,
    );
  }
  return result.data;
}
