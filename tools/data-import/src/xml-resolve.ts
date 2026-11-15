import { parseXml } from './xml';
import type { XmlNode } from './xml';

export interface XmlResolutionIssue {
  kind: string;
  tag?: string;
  file: string;
  line: number;
}
export interface ResolvedXmlNode extends Omit<XmlNode, 'children'> {
  children: ResolvedXmlNode[];
  evidence: readonly { file: string; line: number }[];
  inheritance: 'merge' | 'reset' | 'remove';
}
export interface XmlResolverInput {
  documents: ReadonlyMap<string, string>;
  /** Explicitly exclude irrelevant subtrees before semantic expansion. */
  omitTags?: readonly string[];
  /** Source-reviewed identity keys for repeated child tags, e.g. Suspension WheelType. */
  childIdentityAttributes?: Readonly<Record<string, string>>;
  /** Explicit per-file reference mappings; no DLC precedence is inferred. */
  references: ReadonlyMap<string, string>;
}
export function xmlReferenceKey(
  file: string,
  kind: 'include' | 'parent',
  name: string,
): string {
  return JSON.stringify([file, kind, name]);
}

/** Conservative semantic projection, not a general implementation of the game loader. */
export function resolveXmlDocument(
  entry: string,
  input: XmlResolverInput,
): {
  nodes: ResolvedXmlNode[];
  issues: XmlResolutionIssue[];
} {
  const issues: XmlResolutionIssue[] = [];
  const active = new Set<string>();
  let expansions = 0;
  const parsed = new Map<string, XmlNode[]>();
  function issue(
    kind: string,
    node: Pick<XmlNode, 'file' | 'line'> & Partial<Pick<XmlNode, 'tag'>>,
  ): void {
    issues.push({
      kind,
      file: node.file,
      line: node.line,
      ...(node.tag ? { tag: node.tag } : {}),
    });
  }
  function read(file: string): XmlNode[] {
    const previous = parsed.get(file);
    if (previous) return previous;
    const bytes = input.documents.get(file);
    if (bytes === undefined) throw new Error('Missing supplied XML document');
    function project(nodes: readonly XmlNode[]): XmlNode[] {
      return nodes
        .filter((node) => !input.omitTags?.includes(node.tag))
        .map((node) => ({ ...node, children: project(node.children) }));
    }
    const nodes = project(parseXml(bytes, file));
    parsed.set(file, nodes);
    return nodes;
  }
  function target(
    node: XmlNode,
    kind: 'include' | 'parent',
    name: string,
  ): string | undefined {
    const path = input.references.get(xmlReferenceKey(node.file, kind, name));
    if (!path || !input.documents.has(path)) {
      issue('unresolved-reference', node);
      return undefined;
    }
    return path;
  }
  function merge(
    base: ResolvedXmlNode,
    local: ResolvedXmlNode,
  ): ResolvedXmlNode {
    if (local.inheritance === 'reset')
      return { ...local, evidence: [...base.evidence, ...local.evidence] };
    const children = [...base.children];
    for (const node of [...base.children, ...local.children]) {
      const identity = input.childIdentityAttributes?.[node.tag];
      if (identity && node.attributes[identity] === undefined)
        issue('missing-child-identity', node);
    }
    function sameChild(left: ResolvedXmlNode, right: ResolvedXmlNode): boolean {
      if (left.tag !== right.tag) return false;
      const identity = input.childIdentityAttributes?.[left.tag];
      return (
        !identity ||
        (left.attributes[identity] !== undefined &&
          left.attributes[identity] === right.attributes[identity])
      );
    }
    for (const child of local.children) {
      const matches = children.flatMap((candidate, index) =>
        sameChild(candidate, child) ? [index] : [],
      );
      const index = matches[0];
      const original = index === undefined ? undefined : children[index];
      if (child.inheritance === 'remove') {
        if (matches.length === 1 && index !== undefined)
          children.splice(index, 1);
        else if (matches.length > 1) issue('ambiguous-child-removal', child);
        continue;
      }
      if (
        matches.length === 1 &&
        original &&
        index !== undefined &&
        local.children.filter((candidate) => sameChild(candidate, child))
          .length === 1
      )
        children[index] = merge(original, child);
      else if (matches.length === 0) children.push(child);
      else {
        issue('ambiguous-child-merge', child);
        children.push(child);
      }
    }
    return {
      ...local,
      attributes: { ...base.attributes, ...local.attributes },
      children,
      evidence: [...base.evidence, ...local.evidence],
    };
  }
  function resolve(file: string): ResolvedXmlNode[] {
    if (active.has(file)) {
      issue('document-cycle', { file, line: 1 });
      return [];
    }
    if (active.size >= 128) throw new Error('XML inheritance depth exceeded');
    active.add(file);
    const roots = read(file);
    const templates = new Map<string, XmlNode[]>();
    const libraries = new Set<string>();
    function library(path: string, stack: readonly string[]): void {
      if (stack.includes(path)) {
        issue('include-cycle', { file: path, line: 1 });
        return;
      }
      if (stack.length >= 128) throw new Error('XML include depth exceeded');
      if (libraries.has(path)) return;
      for (const root of read(path).filter(
        (node) => node.tag === '_templates',
      )) {
        if (root.attributes.Include) {
          const include = target(root, 'include', root.attributes.Include);
          if (include) library(include, [...stack, path]);
        }
        for (const group of root.children)
          for (const definition of group.children) {
            const key = JSON.stringify([group.tag, definition.tag]);
            templates.set(key, [
              ...(templates.get(key) ?? []),
              { ...definition, tag: group.tag },
            ]);
          }
      }
      libraries.add(path);
    }
    library(file, []);
    function expand(
      node: XmlNode,
      chain: readonly string[] = [],
    ): ResolvedXmlNode {
      if (++expansions > 100_000 || chain.length > 128)
        throw new Error('XML expansion limit exceeded');
      const attributes = Object.fromEntries(
        Object.entries(node.attributes).filter(([key]) => !key.startsWith('_')),
      );
      const local: ResolvedXmlNode = {
        ...node,
        attributes,
        children: node.children.map((child) => expand(child, chain)),
        evidence: [{ file: node.file, line: node.line }],
        inheritance:
          node.attributes._inheritRemove === 'true'
            ? 'remove'
            : node.attributes._noinherit === 'true'
              ? 'reset'
              : 'merge',
      };
      for (const key of Object.keys(node.attributes))
        if (
          key.startsWith('_') &&
          key !== '_template' &&
          !(
            ['_noinherit', '_inheritRemove'].includes(key) &&
            ['true', 'false'].includes(node.attributes[key] ?? '')
          )
        )
          issue('unsupported-directive', node);
      if (local.inheritance !== 'merge' || !node.attributes._template)
        return local;
      const key = JSON.stringify([node.tag, node.attributes._template]);
      const candidates = templates.get(key) ?? [];
      const base = candidates[0];
      if (chain.includes(key) || candidates.length !== 1 || !base) {
        issue(
          chain.includes(key)
            ? 'template-cycle'
            : 'ambiguous-or-missing-template',
          node,
        );
        return local;
      }
      return merge(expand(base, [...chain, key]), local);
    }
    let nodes = roots
      .filter((node) => !['_templates', '_parent'].includes(node.tag))
      .map((node) => expand(node));
    const parents = roots.filter((node) => node.tag === '_parent');
    if (parents.length > 1) issue('multiple-parents', { file, line: 1 });
    const parent = parents[0];
    if (parent) {
      const path = target(parent, 'parent', parent.attributes.File ?? '');
      if (path) {
        const inherited = resolve(path);
        for (const local of nodes) {
          const matches = inherited.flatMap((node, index) =>
            node.tag === local.tag ? [index] : [],
          );
          const index = matches[0];
          const base = index === undefined ? undefined : inherited[index];
          if (local.inheritance === 'remove') {
            if (matches.length === 1 && index !== undefined)
              inherited.splice(index, 1);
            else if (matches.length > 1)
              issue('ambiguous-parent-removal', local);
            continue;
          }
          if (matches.length === 1 && base && index !== undefined)
            inherited[index] = merge(base, local);
          else if (!matches.length) inherited.push(local);
          else issue('ambiguous-parent-root', local);
        }
        nodes = inherited;
      }
    }
    active.delete(file);
    function prune(nodes: ResolvedXmlNode[]): ResolvedXmlNode[] {
      return nodes
        .filter((node) => node.inheritance !== 'remove')
        .map((node) => ({ ...node, children: prune(node.children) }));
    }
    return prune(nodes);
  }
  return { nodes: resolve(entry), issues };
}
