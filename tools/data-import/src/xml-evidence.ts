import { z } from 'zod';
import { extractXml, xmlManifestSchema } from './xml';
import { resolveXmlDocument } from './xml-resolve';
import type { ResolvedXmlNode } from './xml-resolve';

const id = z.string().trim().min(1);
/** An explicit review of semantic scope; never a replacement for the game loader. */
export const xmlResolutionSchema = z.strictObject({
  entries: z.array(id).min(1),
  references: z.record(id, id),
  omitTags: z.array(id),
  childIdentityAttributes: z.record(id, id),
  rationale: id,
});

type RawEvidence = ReturnType<typeof extractXml>;
export interface ResolvedXmlEvidence extends Omit<RawEvidence, 'report'> {
  report: RawEvidence['report'] & {
    rawIssues: RawEvidence['report']['issues'];
    resolution: z.infer<typeof xmlResolutionSchema>;
    origins: (readonly { file: string; line: number }[])[];
  };
}

/** Hash-check original bytes, then reuse the scoped resolver for semantic evidence. */
export function extractResolvedXml(
  input: unknown,
  contents: ReadonlyMap<string, string>,
  resolutionInput: unknown,
): ResolvedXmlEvidence {
  const manifest = xmlManifestSchema.parse(input);
  const resolution = xmlResolutionSchema.parse(resolutionInput);
  const raw = extractXml(manifest, contents);
  const supplied = new Set(manifest.files.map((file) => file.path));
  for (const path of [
    ...resolution.entries,
    ...Object.values(resolution.references),
  ])
    if (!supplied.has(path))
      throw new Error('Resolution references unverified XML');
  const documents = new Map(
    [...contents].filter(([path]) => supplied.has(path)),
  );
  const results = resolution.entries.map((entry) =>
    resolveXmlDocument(entry, {
      documents,
      references: new Map(Object.entries(resolution.references)),
      omitTags: resolution.omitTags,
      childIdentityAttributes: resolution.childIdentityAttributes,
    }),
  );
  function flatten(nodes: readonly ResolvedXmlNode[]): ResolvedXmlNode[] {
    return nodes.flatMap((node) => [node, ...flatten(node.children)]);
  }
  const nodes = results.flatMap((result) => flatten(result.nodes));
  return {
    ...raw,
    relationships: nodes.map((node) => ({
      kind: node.tag,
      attributes: node.attributes,
      evidence: { file: node.file, line: node.line },
    })),
    report: {
      ...raw.report,
      files: manifest.files,
      issues: results.flatMap((result) =>
        result.issues.map((issue) => ({ ...issue, reference: '' })),
      ),
      rawIssues: raw.report.issues,
      resolution,
      origins: nodes.map((node) => node.evidence),
      limitations: [
        'Scoped semantic resolver; omitted subtrees and explicit reference precedence require source review.',
        'Raw spike issues are retained separately; resolved issues govern projection admission.',
        'A clean scoped graph does not establish complete fitment, current-game authenticity or distribution approval.',
      ],
    },
  };
}
