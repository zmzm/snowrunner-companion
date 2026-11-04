import { z } from 'zod';
import type { TruckId } from '@snowrunner/domain';

export const provenanceSchema = z.object({
  sourceId: z.string().trim().min(1),
  sourceUrl: z.url(),
  sourceVersion: z.string().trim().min(1),
  retrievedAt: z.iso.datetime(),
  usageRights: z.string().trim().min(1),
});
export type Provenance = z.infer<typeof provenanceSchema>;

/** Empty until a licensed, normalized dataset is imported and reviewed. */
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
