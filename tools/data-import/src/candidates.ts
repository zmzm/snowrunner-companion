import { canonicalizeId, componentId } from './canonicalize';
import type { NormalizationReport } from './report';
import { mappingColumn, type ColumnMappings } from './table';

interface Candidate {
  id: string;
  line: number;
  name: string;
  raw: Record<string, string>;
}

export interface MergedCandidate {
  id: string;
  firstLine: number;
  lines: number[];
  names: { value: string; line: number }[];
  raw: Map<string, { value: string; line: number }[]>;
}

interface TabReport {
  discardedRows: NormalizationReport['discardedRows'];
  canonicalIds: NormalizationReport['canonicalIds'];
}

type ResolvedCell =
  | { status: 'unmapped' }
  | { status: 'single'; value: string; line: number }
  | { status: 'disagree'; values: string[]; lines: number[] };

function trimCell(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function buildCandidates(
  file: string,
  columns: ColumnMappings,
  identityColumn: string,
  rows: readonly { line: number; cells: Record<string, string> }[],
  report: TabReport,
  kind: string | null,
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const row of rows) {
    const rawName = trimCell(row.cells[identityColumn]);
    if (rawName === undefined) {
      report.discardedRows.push({
        file,
        row: row.line,
        reason: `missing ${identityColumn}`,
      });
      continue;
    }
    const raw: Record<string, string> = {};
    for (const [field, mapping] of Object.entries(columns)) {
      const column = mappingColumn(mapping);
      if (column === undefined) continue;
      const cell = trimCell(row.cells[column]);
      if (cell !== undefined) raw[field] = cell;
    }
    const id =
      kind === null ? canonicalizeId(rawName) : componentId(kind, rawName);
    report.canonicalIds.push({
      file,
      row: row.line,
      input: rawName,
      canonical: id,
    });
    candidates.push({ id, line: row.line, name: rawName, raw });
  }
  return candidates;
}

export function mergeCandidates(
  candidates: readonly Candidate[],
): MergedCandidate[] {
  const merged = new Map<string, MergedCandidate>();
  for (const candidate of candidates) {
    const existing = merged.get(candidate.id);
    if (existing === undefined) {
      merged.set(candidate.id, {
        id: candidate.id,
        firstLine: candidate.line,
        lines: [candidate.line],
        names: [{ value: candidate.name, line: candidate.line }],
        raw: new Map(
          Object.entries(candidate.raw).map(([field, value]) => [
            field,
            [{ value, line: candidate.line }],
          ]),
        ),
      });
      continue;
    }
    existing.lines.push(candidate.line);
    if (!existing.names.some((entry) => entry.value === candidate.name))
      existing.names.push({ value: candidate.name, line: candidate.line });
    for (const [field, value] of Object.entries(candidate.raw)) {
      const values = existing.raw.get(field);
      if (values === undefined)
        existing.raw.set(field, [{ value, line: candidate.line }]);
      else if (!values.some((entry) => entry.value === value))
        values.push({ value, line: candidate.line });
    }
  }
  return [...merged.values()];
}

export function resolveCell(
  merged: MergedCandidate,
  field: string,
): ResolvedCell {
  const entries = merged.raw.get(field);
  if (entries === undefined || entries.length === 0)
    return { status: 'unmapped' };
  if (entries.length === 1) {
    const entry = entries[0];
    if (entry === undefined) return { status: 'unmapped' };
    return { status: 'single', value: entry.value, line: entry.line };
  }
  return {
    status: 'disagree',
    values: entries.map((entry) => entry.value),
    lines: entries.map((entry) => entry.line),
  };
}
