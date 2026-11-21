import { z } from 'zod';
import {
  datasetSchema,
  truckSchema,
  componentSchema,
  compatibilityRuleSchema,
} from '@snowrunner/game-data';
import type { Dataset } from '@snowrunner/game-data';
import { runImport, sha256Of } from './run';
import type { RunResult } from './run';
import { extractXml, xmlManifestSchema } from './xml';
import { extractResolvedXml } from './xml-evidence';

const id = z.string().trim().min(1);
const evidence = z.strictObject({
  relationshipIndexes: z.array(z.number().int().nonnegative()).min(1),
  rationale: id,
});
/** Operator-reviewed semantic projection; no family or DLC precedence is guessed. */
export const integrationReviewSchema = z.strictObject({
  version: z.literal(1),
  datasetVersion: id,
  truckId: id,
  xmlSourceId: id,
  trucks: z.array(z.strictObject({ entity: truckSchema, evidence })),
  components: z.array(z.strictObject({ entity: componentSchema, evidence })),
  rules: z.array(z.strictObject({ rule: compatibilityRuleSchema, evidence })),
  observations: z.array(
    z.strictObject({
      subject: id,
      detail: id,
      sourceIds: z.array(id).min(1),
    }),
  ),
});

export interface DevelopmentCatalog {
  developmentOnly: true;
  distributionApproved: false;
  dataset: Dataset;
  report: {
    csv: Extract<RunResult, { ok: true }>['report'];
    xml:
      | ReturnType<typeof extractXml>['report']
      | ReturnType<typeof extractResolvedXml>['report'];
    review: z.infer<typeof integrationReviewSchema>;
    conflicts: { path: string; left: unknown; right: unknown }[];
    diagnostics: { subject: string; detail: string }[];
    projections: { applied: number; withheld: number };
    limitations: string[];
  };
}

const unknown = (reason: string) => ({ status: 'unknown' as const, reason });

/** Offline only. Callers retain the result under ignored research paths. */
export function integrateDevelopmentCatalog(input: {
  csvManifest: unknown;
  csvContents: ReadonlyMap<string, string>;
  xmlManifest: unknown;
  xmlContents: ReadonlyMap<string, string>;
  review: unknown;
  xmlResolution?: unknown;
}): DevelopmentCatalog {
  const review = integrationReviewSchema.parse(input.review);
  const csv = runImport(input.csvManifest, input.csvContents);
  if (!csv.ok) throw new Error('CSV dataset validation failed');
  const base = datasetSchema.parse(JSON.parse(csv.datasetJson));
  const manifest = xmlManifestSchema.parse(input.xmlManifest);
  const xml =
    input.xmlResolution === undefined
      ? extractXml(manifest, input.xmlContents)
      : extractResolvedXml(manifest, input.xmlContents, input.xmlResolution);
  const xmlSource = {
    sourceId: review.xmlSourceId,
    sourceUrl: manifest.source.locator,
    // Includes exact file hashes, links, entry and source version.
    sourceVersion: sha256Of(
      JSON.stringify({ manifest, resolution: input.xmlResolution ?? null }),
    ),
    retrievedAt: manifest.source.retrievedAt,
    usageRights: manifest.source.usageRights,
  };
  const diagnostics: { subject: string; detail: string }[] = [];
  const conflicts: { path: string; left: unknown; right: unknown }[] = [];
  function merge(left: unknown, right: unknown, path: string): unknown {
    if (
      typeof left !== 'object' ||
      left === null ||
      typeof right !== 'object' ||
      right === null
    )
      return left;
    const a = z.record(z.string(), z.unknown()).parse(left);
    const b = z.record(z.string(), z.unknown()).parse(right);
    if ('status' in a && 'status' in b) {
      if (b.status === 'unknown') return a;
      if (a.status === 'unknown') return b;
      if (
        a.status === 'known' &&
        b.status === 'known' &&
        JSON.stringify(a.value) === JSON.stringify(b.value)
      )
        return a;
      conflicts.push({ path, left, right });
      const sources = [
        ...new Set(
          [
            a.sourceId,
            b.sourceId,
            ...(Array.isArray(a.sourceIds) ? a.sourceIds : []),
            ...(Array.isArray(b.sourceIds) ? b.sourceIds : []),
          ].filter((s): s is string => typeof s === 'string'),
        ),
      ];
      return {
        status: 'conflict',
        reason: `Disagreement at ${path}`,
        sourceIds: sources,
      };
    }
    return Object.fromEntries(
      Object.entries(a).map(([key, value]) => [
        key,
        key in b ? merge(value, b[key], `${path}.${key}`) : value,
      ]),
    );
  }
  let appliedProjections = 0;
  let withheldProjections = 0;
  function reviewed(e: z.infer<typeof evidence>): boolean {
    for (const index of e.relationshipIndexes)
      if (!xml.relationships[index])
        throw new Error('Review cites missing XML evidence');
    // The spike cannot safely scope all inheritance issues to individual facts.
    if (xml.report.issues.length) {
      withheldProjections++;
      return false;
    }
    appliedProjections++;
    return true;
  }
  function checkSource(value: unknown): void {
    if (Array.isArray(value)) value.forEach(checkSource);
    else if (typeof value === 'object' && value !== null) {
      for (const [key, child] of Object.entries(value)) {
        if (key === 'sourceId' && child !== review.xmlSourceId)
          throw new Error('Reviewed facts must cite the XML source');
        checkSource(child);
      }
    }
  }
  for (const projections of [review.trucks, review.components]) {
    const ids = projections.map((projection) => projection.entity.id);
    if (new Set(ids).size !== ids.length)
      throw new Error('Duplicate reviewed entity ID');
  }
  const trucks = new Map(base.trucks.map((t) => [t.id, t]));
  const components = new Map(base.components.map((c) => [c.id, c]));
  for (const projection of review.trucks) {
    if (projection.entity.id !== review.truckId)
      throw new Error('Review must target one truck');
    checkSource(projection.entity);
    if (!reviewed(projection.evidence)) continue;
    const previous = trucks.get(projection.entity.id);
    trucks.set(
      projection.entity.id,
      truckSchema.parse(
        previous
          ? merge(previous, projection.entity, projection.entity.id)
          : projection.entity,
      ),
    );
  }
  for (const projection of review.components) {
    checkSource(projection.entity);
    if (!reviewed(projection.evidence)) continue;
    const previous = components.get(projection.entity.id);
    if (previous && previous.kind !== projection.entity.kind)
      throw new Error('Canonical component kind mismatch');
    components.set(
      projection.entity.id,
      componentSchema.parse(
        previous
          ? merge(previous, projection.entity, projection.entity.id)
          : projection.entity,
      ),
    );
  }
  const truck = trucks.get(review.truckId);
  if (!truck) throw new Error('Target truck is absent');
  const hasComponent = (key: string) => components.has(key);
  if (truck.sockets.status === 'known') {
    const invalid = truck.sockets.value.some(
      (socket) =>
        (socket.compatibleComponentIds.status === 'known' &&
          socket.compatibleComponentIds.value.some(
            (key) =>
              !hasComponent(key) || components.get(key)?.kind !== socket.kind,
          )) ||
        (socket.defaultComponentId.status === 'known' &&
          socket.defaultComponentId.value !== null &&
          (!hasComponent(socket.defaultComponentId.value) ||
            components.get(socket.defaultComponentId.value)?.kind !==
              socket.kind ||
            (socket.compatibleComponentIds.status === 'known' &&
              !socket.compatibleComponentIds.value.includes(
                socket.defaultComponentId.value,
              )))) ||
        (socket.excludedComponentIds.status === 'known' &&
          socket.excludedComponentIds.value.some((key) => !hasComponent(key))),
    );
    if (invalid) {
      diagnostics.push({
        subject: truck.id,
        detail: 'Unresolved or inconsistent socket component reference',
      });
      truck.sockets = unknown(
        'Socket inventory contains unresolved references',
      );
    }
  }
  for (const component of components.values()) {
    if (
      component.kind === 'wheels' &&
      component.requiredSuspensionIds.status === 'known' &&
      component.requiredSuspensionIds.value.some(
        (key) => components.get(key)?.kind !== 'suspension',
      )
    ) {
      diagnostics.push({
        subject: component.id,
        detail: 'Unresolved suspension reference',
      });
      component.requiredSuspensionIds = unknown(
        'Suspension mapping is unresolved',
      );
    }
  }
  const rules = review.rules
    .filter((r) => reviewed(r.evidence))
    .map((r) => r.rule);
  const resolvedRules = rules.filter(
    (rule) =>
      hasComponent(rule.componentId) &&
      (rule.kind !== 'requires' || hasComponent(rule.requiredComponentId)) &&
      (rule.kind !== 'excludes' || hasComponent(rule.excludedComponentId)) &&
      (rule.kind !== 'requires-any' ||
        rule.requiredComponentIds.every(hasComponent)),
  );
  const rulesResolved = resolvedRules.length === rules.length;
  const unresolvedRuleCount = rules.length - resolvedRules.length;
  appliedProjections -= unresolvedRuleCount;
  withheldProjections += unresolvedRuleCount;
  if (!rulesResolved)
    diagnostics.push({
      subject: truck.id,
      detail: 'Unresolved rule reference',
    });
  const dataset: Dataset = datasetSchema.parse({
    ...base,
    datasetVersion: review.datasetVersion,
    sources: [...base.sources, xmlSource],
    trucks: [truck],
    components: [...components.values()],
    rulesByTruck: {
      [truck.id]:
        (rulesResolved || resolvedRules.length > 0) &&
        xml.report.issues.length === 0
          ? {
              status: 'known',
              value: resolvedRules,
              sourceId: review.xmlSourceId,
            }
          : unknown('XML restrictions are unresolved'),
    },
    ruleCompletenessByTruck: {
      [truck.id]: unknown(
        'Current-game restriction coverage has not been verified',
      ),
    },
  });
  for (const observation of review.observations)
    if (
      observation.sourceIds.some(
        (source) => !dataset.sources.some((s) => s.sourceId === source),
      )
    )
      throw new Error('Observation references unknown source');
  return {
    developmentOnly: true as const,
    distributionApproved: false as const,
    dataset,
    report: {
      csv: csv.report,
      xml: xml.report,
      review,
      conflicts,
      diagnostics,
      projections: {
        applied: appliedProjections,
        withheld: withheldProjections,
      },
      limitations: [
        'Historical XML does not establish current-game behavior.',
        'Reviewed projections require operator verification of semantics, units and complete socket inventories.',
        'Price is outside the domain contract; record discrepancies in observations.',
      ],
    },
  };
}
