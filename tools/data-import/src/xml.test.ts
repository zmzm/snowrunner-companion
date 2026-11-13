import { describe, expect, it } from 'vitest';
import { extractXml, parseXml } from './xml';
import { sha256Of } from './run';

// Authored synthetic fragments; no game facts or extracted XML.
function scenario(
  entry: string,
  extra: Record<string, string> = {},
  links: Record<string, string> = {},
) {
  const contents = new Map(Object.entries({ 'truck.xml': entry, ...extra }));
  const manifest = {
    version: 1,
    source: {
      locator: 'synthetic:test',
      version: 'fixture-v1',
      retrievedAt: '2026-11-13T00:00:00Z',
      usageRights: 'Authored synthetic test',
      adapter: 'synthetic',
    },
    entry: 'truck.xml',
    files: [...contents].map(([path, text]) => ({
      path,
      sha256: sha256Of(text),
    })),
    links,
  };
  return { manifest, contents };
}
function run(
  entry: string,
  extra: Record<string, string> = {},
  links: Record<string, string> = {},
) {
  const { manifest, contents } = scenario(entry, extra, links);
  return extractXml(manifest, contents);
}
describe('synthetic XML relationship extraction', () => {
  it('resolves transitive libraries, template attributes, overrides and component defaults', () => {
    const result = run(
      '<_templates Include="library"/><Truck><EngineSocket _template="base" Default="invented_engine"/></Truck>',
      {
        'library.xml': '<_templates Include="common"/>',
        'common.xml':
          '<_templates><EngineSocket><base Type="invented_family" Default="old"/></EngineSocket></_templates>',
        'engine.xml':
          '<EngineVariants><Engine Name="invented_engine"/></EngineVariants>',
      },
      {
        library: 'library.xml',
        common: 'common.xml',
        invented_family: 'engine.xml',
        invented_engine: 'engine.xml',
      },
    );
    expect(
      result.relationships.find((node) => node.kind === 'EngineSocket')
        ?.attributes,
    ).toMatchObject({ Type: 'invented_family', Default: 'invented_engine' });
    expect(result.report.issues).toEqual([]);
    expect(result.report.files).toHaveLength(4);
    expect(result.report.templateEvidence[0]?.definitions[0]?.file).toBe(
      'common.xml',
    );
  });
  it('retains wheel prerequisites, socket exclusions and unresolved defaults without guessing compatibility', () => {
    const result = run(
      '<Truck><CompatibleWheels Type="missing_wheels" Suspension="raised"/><AddonSockets><Socket Names="bed" NamesBlock="crane"/><DefaultAddon Addon="missing_bed"/></AddonSockets><GearboxSocket Type="g"/><SuspensionSocket Type="s"/></Truck>',
    );
    expect(
      result.relationships.find((node) => node.kind === 'Socket')?.attributes,
    ).toEqual({ Names: 'bed', NamesBlock: 'crane' });
    expect(result.report.issues.map((issue) => issue.reference)).toEqual([
      'missing_wheels',
      'missing_bed',
      'g',
      's',
    ]);
    expect(result.report.complete).toBe(false);
  });
  it('reports parent merge ambiguity and cycles', () => {
    const result = run(
      '<_parent File="parent"/><Truck/>',
      { 'parent.xml': '<_parent File="child"/><Truck/>' },
      { parent: 'parent.xml', child: 'truck.xml' },
    );
    expect(result.report.issues.map((issue) => issue.kind)).toContain(
      'dependency-cycle',
    );
    expect(result.report.issues.map((issue) => issue.kind)).toContain(
      'unresolved-parent-merge',
    );
  });
  it('preserves ambiguous templates and unsupported merge directives', () => {
    const result = run(
      '<_templates><Socket><base Names="a"/><base Names="b"/></Socket></_templates><Truck><Socket _template="base" _replace="true"/></Truck>',
    );
    expect(result.report.issues.map((issue) => issue.kind)).toEqual([
      'unresolved-or-ambiguous-template',
      'unsupported-directive',
    ]);
  });
  it('rejects malformed XML, external entities, invalid manifests and modified bytes', () => {
    expect(() => parseXml('<Truck>', 'test')).toThrow();
    expect(() =>
      parseXml('<!DOCTYPE x SYSTEM "file:///secret"><Truck/>', 'test'),
    ).toThrow();
    expect(() => extractXml({}, new Map())).toThrow();
    const { manifest, contents } = scenario('<Truck/>');
    contents.set('truck.xml', '<Truck Changed="true"/>');
    expect(() => extractXml(manifest, contents)).toThrow('hash mismatch');
  });
  it('is deterministic across runs', () => {
    expect(run('<Truck><EngineSocket Type="missing"/></Truck>')).toEqual(
      run('<Truck><EngineSocket Type="missing"/></Truck>'),
    );
  });
});

// Synthetic reductions of historical-source failure shapes, never copied game XML.
describe('strict XML source anomaly handling', () => {
  it('rejects repeated attributes whether their values agree or disagree', () => {
    expect(() =>
      parseXml('<Wheel Flag="yes" Flag="yes"/>', 'synthetic.xml'),
    ).toThrow('duplicate attribute');
    expect(() =>
      parseXml('<Wheel Flag="yes" Flag="no"/>', 'synthetic.xml'),
    ).toThrow('duplicate attribute');
  });

  it('rejects stray punctuation and orphan attribute-like text without inventing attributes', () => {
    expect(() =>
      parseXml('<Truck><Socket/>></Truck>', 'synthetic.xml'),
    ).toThrow('Text XML content is unsupported');
    expect(() =>
      parseXml(
        '<Truck><Cameras>Label="synthetic"</Cameras></Truck>',
        'synthetic.xml',
      ),
    ).toThrow('Text XML content is unsupported');
  });

  it('accepts whitespace and comments between fragments', () => {
    expect(
      parseXml('<!-- synthetic -->\n<Truck/>\n<Engine/>', 'synthetic.xml').map(
        (node) => node.tag,
      ),
    ).toEqual(['Truck', 'Engine']);
  });
});
