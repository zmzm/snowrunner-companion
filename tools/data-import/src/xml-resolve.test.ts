import { describe, expect, it } from 'vitest';
import { resolveXmlDocument, xmlReferenceKey } from './xml-resolve';
// Authored synthetic data. No extracted game XML.
function run(
  documents: Record<string, string>,
  references: [string, string][] = [],
) {
  return resolveXmlDocument('entry', {
    documents: new Map(Object.entries(documents)),
    references: new Map(references),
  });
}
describe('scoped XML semantic projection', () => {
  it('resolves transitive templates and preserves override evidence', () => {
    const result = run(
      {
        entry:
          '<_templates Include="lib"/><Part _template="base" Value="local"/>',
        lib: '<_templates Include="shared"/>',
        shared:
          '<_templates><Part><base Value="inherited" Other="kept"/></Part></_templates>',
      },
      [
        [xmlReferenceKey('entry', 'include', 'lib'), 'lib'],
        [xmlReferenceKey('lib', 'include', 'shared'), 'shared'],
      ],
    );
    expect(result.issues).toEqual([]);
    expect(result.nodes[0]?.attributes).toEqual({
      Value: 'local',
      Other: 'kept',
    });
    expect(result.nodes[0]?.evidence.map((item) => item.file)).toEqual([
      'shared',
      'entry',
    ]);
  });
  it('merges unique inherited hierarchies while preserving unrelated children', () => {
    const result = run(
      {
        entry: '<_parent File="base"/><Part><Info Local="yes"/></Part>',
        base: '<Part><Info Inherited="yes"/><Extra/></Part>',
      },
      [[xmlReferenceKey('entry', 'parent', 'base'), 'base']],
    );
    expect(result.issues).toEqual([]);
    expect(result.nodes[0]?.children[0]?.attributes).toEqual({
      Inherited: 'yes',
      Local: 'yes',
    });
    expect(result.nodes[0]?.children[1]?.tag).toBe('Extra');
  });
  it('reports ambiguous repeated child removals', () => {
    const result = run({
      entry:
        '<_templates><Part><base><Child/><Child/></base></Part></_templates><Part _template="base"><Child _inheritRemove="true"/></Part>',
    });
    expect(result.issues.map((issue) => issue.kind)).toEqual(
      expect.arrayContaining(['ambiguous-child-removal']),
    );
  });
  it('resets inherited attributes and children without losing local fields', () => {
    const result = run(
      {
        entry:
          '<_parent File="base"/><Part><Info _noinherit="true" Local="yes"/></Part>',
        base: '<Part><Info Inherited="yes"><Old/></Info><Keep/></Part>',
      },
      [[xmlReferenceKey('entry', 'parent', 'base'), 'base']],
    );
    expect(result.issues).toEqual([]);
    expect(result.nodes[0]?.children[0]?.attributes).toEqual({ Local: 'yes' });
    expect(result.nodes[0]?.children[0]?.children).toEqual([]);
    expect(result.nodes[0]?.children[1]?.tag).toBe('Keep');
  });
  it('removes an unambiguous inherited tag and leaves its siblings intact', () => {
    const result = run(
      {
        entry:
          '<_parent File="base"/><Part><Drop _inheritRemove="true"/></Part>',
        base: '<Part><Drop/><Keep/></Part>',
      },
      [[xmlReferenceKey('entry', 'parent', 'base'), 'base']],
    );
    expect(result.issues).toEqual([]);
    expect(result.nodes[0]?.children.map((node) => node.tag)).toEqual(['Keep']);
  });
  it('resets template inheritance and preserves locally declared children', () => {
    const result = run({
      entry:
        '<_templates><Part><base Inherited="yes"><Old/></base></Part></_templates><Part _template="base" _noinherit="true" Local="yes"><Keep/></Part>',
    });
    expect(result.issues).toEqual([]);
    expect(result.nodes[0]?.attributes).toEqual({ Local: 'yes' });
    expect(result.nodes[0]?.children.map((node) => node.tag)).toEqual(['Keep']);
  });
  it('rejects unsupported or invalid directive values as unresolved evidence', () => {
    expect(
      run({ entry: '<Part _noinherit="maybe" _replace="true"/>' }).issues.map(
        (issue) => issue.kind,
      ),
    ).toEqual(['unsupported-directive', 'unsupported-directive']);
  });
  it('reports duplicate template definitions rather than choosing a winner', () => {
    expect(
      run({
        entry:
          '<_templates><Part><base/><base/></Part></_templates><Part _template="base"/>',
      }).issues[0]?.kind,
    ).toBe('ambiguous-or-missing-template');
  });
  it('detects document and template cycles', () => {
    expect(
      run({ entry: '<_parent File="self"/><Part/>' }, [
        [xmlReferenceKey('entry', 'parent', 'self'), 'entry'],
      ]).issues[0]?.kind,
    ).toBe('document-cycle');
    expect(
      run({
        entry:
          '<_templates><Part><a _template="a"/></Part></_templates><Part _template="a"/>',
      }).issues[0]?.kind,
    ).toBe('template-cycle');
  });
  it('merges repeated children only under an explicit unique identity policy', () => {
    const result = resolveXmlDocument('entry', {
      documents: new Map([
        [
          'entry',
          '<_parent File="base"/><Part><Axis Role="front" Height="2"/><Axis Role="rear" Height="3"/></Part>',
        ],
        [
          'base',
          '<Part><Axis Role="front" Height="1" Other="kept"/><Axis Role="rear" Height="1"/></Part>',
        ],
      ]),
      references: new Map([
        [xmlReferenceKey('entry', 'parent', 'base'), 'base'],
      ]),
      childIdentityAttributes: { Axis: 'Role' },
    });
    expect(result.issues).toEqual([]);
    expect(
      result.nodes[0]?.children.map((node) => node.attributes.Height),
    ).toEqual(['2', '3']);
    expect(result.nodes[0]?.children[0]?.attributes.Other).toBe('kept');
  });
  it('reports missing keys under an explicit child identity policy', () => {
    const result = resolveXmlDocument('entry', {
      documents: new Map([
        [
          'entry',
          '<_templates><Part><base><Axis/></base></Part></_templates><Part _template="base"><Axis Role="front"/></Part>',
        ],
      ]),
      references: new Map(),
      childIdentityAttributes: { Axis: 'Role' },
    });
    expect(
      result.issues.some((issue) => issue.kind === 'missing-child-identity'),
    ).toBe(true);
  });
  it('projects out explicitly irrelevant subtrees before merging', () => {
    const result = resolveXmlDocument('entry', {
      documents: new Map([
        [
          'entry',
          '<_templates><Part><base><Visual><Child/><Child/></Visual><Info Value="base"/></base></Part></_templates><Part _template="base"><Visual><Child/></Visual><Info Value="override"/></Part>',
        ],
      ]),
      references: new Map(),
      omitTags: ['Visual'],
    });
    expect(result.issues).toEqual([]);
    expect(result.nodes[0]?.children.map((node) => node.tag)).toEqual(['Info']);
    expect(result.nodes[0]?.children[0]?.attributes.Value).toBe('override');
  });
  it('reports missing includes and rejects malformed supplied input', () => {
    expect(
      run({ entry: '<_templates Include="missing"/><Part/>' }).issues[0]?.kind,
    ).toBe('unresolved-reference');
    expect(() => run({ entry: '<Part>' })).toThrow();
  });
});
