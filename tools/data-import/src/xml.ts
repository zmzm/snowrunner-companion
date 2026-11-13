import { SaxesParser } from 'saxes';
import { z } from 'zod';
import { sha256Of } from './run';

const fileSchema = z.strictObject({
  path: z.string().min(1),
  sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});
export const xmlManifestSchema = z.strictObject({
  version: z.literal(1),
  source: z.strictObject({
    locator: z.string().min(1),
    version: z.string().min(1),
    retrievedAt: z.iso.datetime(),
    usageRights: z.string().min(1),
    adapter: z.enum(['installed-archive', 'public-xml', 'synthetic']),
  }),
  entry: z.string().min(1),
  files: z.array(fileSchema).min(1),
  // Explicit names avoid guessing search paths or DLC precedence.
  links: z.record(z.string(), z.string()),
});
export interface XmlNode {
  tag: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  file: string;
  line: number;
}
export function parseXml(content: string, file: string): XmlNode[] {
  if (content.length > 8_000_000) throw new Error('XML size limit exceeded');
  const roots: XmlNode[] = [];
  const stack: XmlNode[] = [];
  const parser = new SaxesParser({ fragment: true });
  let count = 0;
  parser.on('doctype', () => {
    throw new Error('DOCTYPE is unsupported');
  });
  parser.on('opentag', (tag) => {
    if (++count > 100_000 || stack.length > 128)
      throw new Error('XML complexity limit exceeded');
    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(tag.attributes)) {
      if (typeof value !== 'string')
        throw new Error('Unexpected namespaced attribute');
      Object.defineProperty(attributes, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    const node = {
      tag: tag.name,
      attributes,
      children: [],
      file,
      line: parser.line,
    };
    const parent = stack.at(-1);
    (parent === undefined ? roots : parent.children).push(node);
    stack.push(node);
  });
  parser.on('closetag', () => {
    stack.pop();
  });
  parser.on('text', (text) => {
    if (text.trim())
      throw new Error(
        'Text XML content is unsupported by this relationship spike',
      );
  });
  parser.write(content).close();
  return roots;
}

interface Issue {
  kind: string;
  file: string;
  line: number;
  reference: string;
}
interface Relationship {
  kind: string;
  attributes: Record<string, string>;
  evidence: { file: string; line: number };
}
const relevant =
  /^(EngineSocket|GearboxSocket|SuspensionSocket|WinchUpgradeSocket|CompatibleWheels|AddonSockets|Socket|DefaultAddon|RequiredAddon|ExcludedAddon|Engine|Gearbox|SuspensionSet|TruckWheels|TruckAddon)$/;

/** Development evidence graph, deliberately separate from the production Dataset. */
export function extractXml(
  input: unknown,
  contents: ReadonlyMap<string, string>,
) {
  const manifest = xmlManifestSchema.parse(input);
  const documents = new Map<string, XmlNode[]>();
  for (const file of manifest.files) {
    if (documents.has(file.path)) throw new Error('Duplicate XML path');
    const content = contents.get(file.path);
    if (content === undefined || sha256Of(content) !== file.sha256)
      throw new Error('Missing XML or hash mismatch');
    documents.set(file.path, parseXml(content, file.path));
  }
  if (!documents.has(manifest.entry))
    throw new Error('Entry XML is not supplied');
  const issues: Issue[] = [];
  const relationships: Relationship[] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  const templates = new Map<string, XmlNode[]>();
  function issue(kind: string, node: XmlNode, reference: string) {
    issues.push({ kind, file: node.file, line: node.line, reference });
  }
  function follow(reference: string, node: XmlNode): void {
    const path = manifest.links[reference];
    if (path === undefined || !documents.has(path)) {
      issue('unresolved-link', node, reference);
      return;
    }
    visit(path);
  }
  function expand(node: XmlNode, chain: readonly string[] = []): XmlNode {
    const name = node.attributes._template;
    if (name === undefined) return node;
    const key = `${node.tag}:${name}`;
    const candidates = templates.get(key) ?? [];
    const base = candidates[0];
    if (chain.includes(key) || candidates.length !== 1 || base === undefined) {
      issue(
        chain.includes(key)
          ? 'template-cycle'
          : 'unresolved-or-ambiguous-template',
        node,
        key,
      );
      return node;
    }
    const resolved = expand(base, [...chain, key]);
    // Only attribute inheritance is established here. Child merging stays explicit.
    if (resolved.children.length)
      issue('unresolved-template-children', node, key);
    return {
      ...node,
      attributes: { ...resolved.attributes, ...node.attributes },
    };
  }
  function walk(node: XmlNode) {
    const expanded = expand(node);
    if (relevant.test(node.tag))
      relationships.push({
        kind: node.tag,
        attributes: expanded.attributes,
        evidence: { file: node.file, line: node.line },
      });
    for (const [key, value] of Object.entries(expanded.attributes)) {
      if (['Type', 'Types', 'Default', 'Addon'].includes(key)) {
        for (const reference of value
          .split(/[,;]/)
          .map((part) => part.trim())
          .filter(Boolean))
          follow(reference, node);
      }
      if (key.startsWith('_') && key !== '_template')
        issue('unsupported-directive', node, `${key}=${value}`);
    }
    for (const child of node.children) walk(child);
  }
  function visit(path: string): void {
    const roots = documents.get(path);
    if (roots === undefined) return;
    if (active.has(path)) {
      issues.push({
        kind: 'dependency-cycle',
        file: path,
        line: 1,
        reference: path,
      });
      return;
    }
    if (visited.has(path)) return;
    active.add(path);
    for (const node of roots) {
      if (node.tag === '_templates') {
        if (node.attributes.Include) follow(node.attributes.Include, node);
        for (const group of node.children)
          for (const template of group.children) {
            const key = `${group.tag}:${template.tag}`;
            templates.set(key, [
              ...(templates.get(key) ?? []),
              { ...template, tag: group.tag },
            ]);
          }
      } else if (node.tag === '_parent') {
        follow(node.attributes.File ?? '', node);
        issue('unresolved-parent-merge', node, node.attributes.File ?? '');
      }
    }
    for (const node of roots)
      if (!['_templates', '_parent'].includes(node.tag)) walk(node);
    active.delete(path);
    visited.add(path);
  }
  visit(manifest.entry);
  return {
    developmentOnly: true,
    schemaVersion: 1,
    source: manifest.source,
    relationships,
    report: {
      complete: false,
      limitations: [
        'Attribute-only template inheritance; parent and child merges require review.',
        'References and socket attributes are evidence, never a compatibility verdict.',
        'No DLC precedence, localization, unit or reuse-rights validation.',
      ],
      files: manifest.files.filter((file) => visited.has(file.path)),
      issues,
      templateEvidence: [...templates.entries()].map(([name, nodes]) => ({
        name,
        definitions: nodes.map(({ file, line, attributes }) => ({
          file,
          line,
          attributes,
        })),
      })),
    },
  };
}
