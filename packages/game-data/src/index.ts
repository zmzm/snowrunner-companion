import { z } from 'zod';
import type { TruckId } from '@snowrunner/domain';
import { componentSchema, truckSchema } from './entities';

export const provenanceSchema = z.object({
  sourceId: z.string().trim().min(1),
  sourceUrl: z.url(),
  sourceVersion: z.string().trim().min(1),
  retrievedAt: z.iso.datetime(),
  usageRights: z.string().trim().min(1),
});
export type Provenance = z.infer<typeof provenanceSchema>;

/** Empty until a normalized dataset is imported and reviewed. */
export interface CatalogStatus {
  schemaVersion: 1;
  datasetVersion: string | null;
  truckIds: readonly TruckId[];
  sources: readonly Provenance[];
}
export const catalogStatus: CatalogStatus = {
  schemaVersion: 1,
  datasetVersion: null,
  truckIds: [],
  sources: [],
};

export {
  availabilitySchema,
  componentKindSchema,
  componentSchema,
  requirementSchema,
  sourcedValueSchema,
  truckBuildSchema,
  truckSchema,
  truckSocketSchema,
} from './entities';

/** Ingestion contract for normalized datasets. */
export const datasetSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    datasetVersion: z.string().trim().min(1),
    sources: z.array(provenanceSchema).min(1),
    trucks: z.array(truckSchema),
    components: z.array(componentSchema),
  })
  .superRefine((dataset, context) => {
    for (const key of ['sources', 'trucks', 'components'] satisfies readonly (
      'sources' | 'trucks' | 'components'
    )[]) {
      const ids =
        key === 'sources'
          ? dataset.sources.map((source) => source.sourceId)
          : dataset[key].map((entity) => entity.id);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'IDs must be unique',
        });
      }
    }
    const sourceIds = new Set(dataset.sources.map((source) => source.sourceId));
    function checkSources(value: unknown, path: (string | number)[]): void {
      if (Array.isArray(value)) {
        value.forEach((item: unknown, index: number) =>
          checkSources(item, [...path, index]),
        );
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, item] of Object.entries(value)) {
          if (
            key === 'sourceId' &&
            typeof item === 'string' &&
            !sourceIds.has(item)
          ) {
            context.addIssue({
              code: 'custom',
              path: [...path, key],
              message: 'Unknown provenance source ID',
            });
          } else if (key === 'sourceIds' && Array.isArray(item)) {
            item.forEach((id: unknown, index: number) => {
              if (typeof id === 'string' && !sourceIds.has(id)) {
                context.addIssue({
                  code: 'custom',
                  path: [...path, key, index],
                  message: 'Unknown provenance source ID',
                });
              }
            });
          } else {
            checkSources(item, [...path, key]);
          }
        }
      }
    }
    checkSources(dataset.trucks, ['trucks']);
    checkSources(dataset.components, ['components']);
  });
export type Dataset = z.infer<typeof datasetSchema>;
