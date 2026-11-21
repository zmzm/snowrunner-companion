import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateBuild } from '@snowrunner/domain';
import { datasetSchema } from '@snowrunner/game-data';
import {
  integrateDevelopmentCatalog,
  integrationReviewSchema,
} from './integrate';
import { runImport, sha256Of } from './run';
import { parseManifest } from './manifest';

// Entirely authored synthetic ANK-shaped CSV and XML, never game evidence.
function scenario(
  xml = '<Truck><EngineSocket Type="synthetic" Default="synthetic-engine"/></Truck>',
) {
  const root = new URL('../../../fixtures/synthetic/srnfo/', import.meta.url);
  const csvManifest = parseManifest(
    JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')),
  );
  const csvContents = new Map<string, string>();
  for (const tab of [
    csvManifest.trucks,
    csvManifest.engines,
    csvManifest.gearboxes,
    csvManifest.wheels,
    csvManifest.addons,
  ])
    if (tab)
      csvContents.set(tab.path, readFileSync(new URL(tab.path, root), 'utf8'));
  const csv = runImport(csvManifest, csvContents);
  if (!csv.ok) throw new Error('Synthetic import failed');
  const dataset = datasetSchema.parse(JSON.parse(csv.datasetJson));
  const truck = dataset.trucks.find((t) => t.id === 'synthetic-mk38');
  if (!truck) throw new Error('Missing fixture truck');
  const known = <T>(value: T) => ({
    status: 'known' as const,
    value,
    sourceId: 'synthetic-xml',
  });
  const evidence = {
    relationshipIndexes: [0],
    rationale:
      'Synthetic socket inventory and family mapping reviewed for this fixture only',
  };
  return {
    csvManifest,
    csvContents,
    xmlManifest: {
      version: 1,
      source: {
        locator: 'https://example.com/synthetic.xml',
        version: 'synthetic-v1',
        retrievedAt: '2026-11-13T00:00:00Z',
        usageRights: 'Authored synthetic fixture',
        adapter: 'synthetic',
      },
      entry: 'truck.xml',
      files: [
        { path: 'truck.xml', sha256: sha256Of(xml) },
        {
          path: 'engine.xml',
          sha256: sha256Of('<Engine Name="synthetic-engine"/>'),
        },
      ],
      links: { synthetic: 'engine.xml', 'synthetic-engine': 'engine.xml' },
    },
    xmlContents: new Map([
      ['truck.xml', xml],
      ['engine.xml', '<Engine Name="synthetic-engine"/>'],
    ]),
    review: {
      version: 1,
      datasetVersion: 'synthetic-development-v1',
      truckId: truck.id,
      xmlSourceId: 'synthetic-xml',
      trucks: [
        {
          entity: {
            ...truck,
            availability: {
              unlock: { status: 'unknown', reason: 'Not reviewed in XML' },
              dlcIds: { status: 'unknown', reason: 'Not reviewed in XML' },
            },
            drivetrain: {
              awd: known('switchable'),
              differentialLock: { status: 'unknown', reason: 'Not reviewed' },
            },
            bed: { status: 'unknown', reason: 'Not reviewed' },
            sockets: known([
              {
                id: 'engine',
                kind: 'engine',
                compatibleComponentIds: known(['engine:synth-v8-fixture']),
                defaultComponentId: known('engine:synth-v8-fixture'),
                excludedComponentIds: {
                  status: 'unknown',
                  reason: 'Not reviewed',
                },
              },
            ]),
          },
          evidence,
        },
      ],
      components: [],
      rules: [],
      observations: [
        {
          subject: truck.id,
          detail:
            'Synthetic price disagreement: CSV 100 / XML 200; price is not a domain field',
          sourceIds: ['synthetic-srnfo-trucks', 'synthetic-xml'],
        },
      ],
    },
  };
}

describe('development catalog integration with synthetic evidence', () => {
  it('joins CSV entities and reviewed XML sockets, preserves disagreements and hands off to validateBuild', () => {
    const input = scenario();
    const result = integrateDevelopmentCatalog(input);
    expect(datasetSchema.safeParse(result.dataset).success).toBe(true);
    expect(result.dataset.trucks[0]?.sockets.status).toBe('known');
    expect(result.dataset.trucks[0]?.drivetrain.awd.status).toBe('conflict');
    expect(result.report.conflicts).toHaveLength(1);
    expect(result.report.review.observations).toHaveLength(1);
    expect(result.distributionApproved).toBe(false);
    expect(
      validateBuild(
        {
          schemaVersion: 1,
          datasetVersion: result.dataset.datasetVersion,
          id: 'synthetic-build',
          name: 'Synthetic',
          truckId: 'synthetic-mk38',
          selections: [
            { socketId: 'engine', componentId: 'engine:synth-v8-fixture' },
          ],
        },
        { ...result.dataset, rulesByTruck: result.dataset.rulesByTruck ?? {} },
      ).status,
    ).toBe('unknown');
    expect(integrateDevelopmentCatalog(input)).toEqual(result);
  });
  it('withholds reviewed facts when XML references remain unresolved', () => {
    const result = integrateDevelopmentCatalog(
      scenario('<Truck><EngineSocket Type="missing"/></Truck>'),
    );
    expect(result.dataset.trucks[0]?.sockets.status).toBe('unknown');
    expect(
      result.report.xml.issues.some((i) => i.kind === 'unresolved-link'),
    ).toBe(true);
  });
  it('keeps dangling canonical socket references unknown', () => {
    const input = scenario();
    const socket = input.review.trucks[0]?.entity.sockets.value[0];
    if (!socket) throw new Error('Missing socket');
    socket.compatibleComponentIds.value = ['missing'];
    const result = integrateDevelopmentCatalog(input);
    expect(result.dataset.trucks[0]?.sockets.status).toBe('unknown');
    expect(result.report.diagnostics).toHaveLength(1);
  });
  it('adds reviewed XML-only components and retains unresolved wheel and rule dependencies', () => {
    const input = scenario();
    const review = integrationReviewSchema.parse(input.review);
    const evidence = {
      relationshipIndexes: [1],
      rationale:
        'Synthetic reduction of reviewed component facts and unresolved dependencies',
    };
    const unknown = {
      status: 'unknown' as const,
      reason: 'Synthetic evidence is incomplete',
    };
    review.components.push({
      entity: {
        id: 'wheels:synthetic-extra',
        name: 'Synthetic wheels',
        kind: 'wheels',
        availability: { unlock: unknown, dlcIds: unknown },
        diameterInches: {
          status: 'known',
          value: 42,
          sourceId: 'synthetic-xml',
        },
        requiredSuspensionIds: {
          status: 'known',
          value: ['missing-suspension'],
          sourceId: 'synthetic-xml',
        },
      },
      evidence,
    });
    review.rules.push({
      rule: {
        kind: 'requires',
        componentId: 'wheels:synthetic-extra',
        requiredComponentId: 'missing-addon',
      },
      evidence,
    });
    const result = integrateDevelopmentCatalog({ ...input, review });
    const wheels = result.dataset.components.find(
      (c) => c.id === 'wheels:synthetic-extra',
    );
    expect(
      wheels?.kind === 'wheels' && wheels.requiredSuspensionIds.status,
    ).toBe('unknown');
    expect(result.dataset.rulesByTruck?.['synthetic-mk38']?.status).toBe(
      'unknown',
    );
    expect(result.report.diagnostics).toHaveLength(2);
  });
  it('rejects malformed projections, evidence indexes, and tampered source bytes', () => {
    const input = scenario();
    expect(() =>
      integrateDevelopmentCatalog({ ...input, review: {} }),
    ).toThrow();
    const projection = input.review.trucks[0];
    if (!projection) throw new Error('Missing projection');
    projection.evidence.relationshipIndexes = [999];
    expect(() => integrateDevelopmentCatalog(input)).toThrow(
      'missing XML evidence',
    );
    input.xmlContents.set('truck.xml', '<Truck/>');
    expect(() => integrateDevelopmentCatalog(input)).toThrow('hash mismatch');
  });
});
