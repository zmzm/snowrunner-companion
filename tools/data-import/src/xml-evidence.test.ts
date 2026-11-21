import { describe, expect, it } from 'vitest';
import { extractResolvedXml } from './xml-evidence';
import { sha256Of } from './run';
import { xmlReferenceKey } from './xml-resolve';

// Authored synthetic fragments, never source-derived game data.
function scenario() {
  const contents = new Map([
    [
      'truck.xml',
      '<_parent File="base"/><Truck><TruckData><EngineSocket Default="invented"/></TruckData></Truck>',
    ],
    [
      'base.xml',
      '<Truck><TruckData><EngineSocket Type="invented-family"/></TruckData></Truck>',
    ],
  ]);
  return {
    contents,
    manifest: {
      version: 1,
      source: {
        locator: 'synthetic:resolved-test',
        version: 'fixture-1',
        retrievedAt: '2026-11-21T00:00:00Z',
        usageRights: 'Authored synthetic fixture',
        adapter: 'synthetic',
      },
      entry: 'truck.xml',
      files: [...contents].map(([path, text]) => ({
        path,
        sha256: sha256Of(text),
      })),
      links: {},
    },
    resolution: {
      entries: ['truck.xml'],
      references: {
        [xmlReferenceKey('truck.xml', 'parent', 'base')]: 'base.xml',
      },
      omitTags: [],
      childIdentityAttributes: {},
      rationale: 'Synthetic parent socket hierarchy is unambiguous',
    },
  };
}
describe('reviewed scoped XML evidence', () => {
  it('resolves inherited socket facts and retains both origins and raw-spike limitations', () => {
    const { manifest, contents, resolution } = scenario();
    const result = extractResolvedXml(manifest, contents, resolution);
    expect(
      result.relationships.find((r) => r.kind === 'EngineSocket')?.attributes,
    ).toEqual({ Type: 'invented-family', Default: 'invented' });
    expect(result.report.issues).toEqual([]);
    expect(
      result.report.rawIssues.some((i) => i.kind === 'unresolved-parent-merge'),
    ).toBe(true);
    expect(result.report.origins.some((origins) => origins.length === 2)).toBe(
      true,
    );
  });
  it('retains unresolved directives and rejects input changes or unverified references', () => {
    const { manifest, contents, resolution } = scenario();
    expect(() =>
      extractResolvedXml(manifest, contents, {
        ...resolution,
        entries: ['unverified.xml'],
      }),
    ).toThrow('unverified XML');
    contents.set('base.xml', '<Truck _replace="true"/>');
    expect(() => extractResolvedXml(manifest, contents, resolution)).toThrow(
      'hash mismatch',
    );
    manifest.files = manifest.files.map((file) => ({
      ...file,
      sha256: sha256Of(contents.get(file.path) ?? ''),
    }));
    const result = extractResolvedXml(manifest, contents, resolution);
    expect(
      result.report.issues.some((i) => i.kind === 'unsupported-directive'),
    ).toBe(true);
  });
});
