import type { SourcedValue } from '@snowrunner/domain';
import { resolveCell, type MergedCandidate } from './candidates';
import type { FieldDisposition, NormalizationReport } from './report';
type Inconsistencies = NormalizationReport['inconsistencies'];

function recordInconsistency(
  merged: MergedCandidate,
  field: string,
  file: string,
  inconsistencies: Inconsistencies,
): string {
  const entries = merged.raw.get(field) ?? [];
  inconsistencies.push({
    file,
    rows: entries.map((entry) => entry.line),
    field,
    values: entries.map((entry) => entry.value),
    resolution:
      'field recorded as unknown; raw values retained in this report for source review',
  });
  return `intra-source disagreement on "${field}" between rows ${entries
    .map((entry) => entry.line)
    .join(', ')} of ${file}; raw values retained in the import report`;
}

export class FieldFactory {
  constructor(
    private readonly sourceId: string,
    private readonly file: string,
    private readonly merged: MergedCandidate,
    private readonly inconsistencies: Inconsistencies,
  ) {}

  known<T>(value: T): SourcedValue<T> {
    return { status: 'known', value, sourceId: this.sourceId };
  }
  unknown(reason: string): SourcedValue<never> {
    return { status: 'unknown', reason };
  }
  disagree(field: string): SourcedValue<never> {
    return this.unknown(
      recordInconsistency(this.merged, field, this.file, this.inconsistencies),
    );
  }

  token<T>(
    field: string,
    mapping: { column: string; tokens: Record<string, T> } | undefined,
  ): { value: SourcedValue<T>; disposition: FieldDisposition } {
    if (mapping === undefined)
      return {
        value: this.unknown(`${field} column not mapped for this source`),
        disposition: { status: 'unknown', detail: 'column not mapped' },
      };
    const cell = resolveCell(this.merged, field);
    if (cell.status === 'unmapped')
      return {
        value: this.unknown(`${field} blank in this source`),
        disposition: { status: 'unknown', detail: 'blank cell' },
      };
    if (cell.status === 'disagree')
      return {
        value: this.disagree(field),
        disposition: { status: 'unknown', detail: 'intra-source disagreement' },
      };
    const token = mapping.tokens[cell.value];
    if (token === undefined)
      return {
        value: this.unknown(
          `unrecognized ${field} value "${cell.value}" (${this.file} row ${cell.line})`,
        ),
        disposition: {
          status: 'unknown',
          detail: `unrecognized token "${cell.value}"`,
        },
      };
    return {
      value: this.known(token),
      disposition: {
        status: 'known',
        detail: `token "${cell.value}" from column "${mapping.column}"`,
      },
    };
  }

  count(
    field: string,
    column: string | undefined,
    options: { allowZero: boolean },
  ): { value: SourcedValue<number>; disposition: FieldDisposition } {
    if (column === undefined)
      return {
        value: this.unknown(`${field} column not mapped for this source`),
        disposition: { status: 'unknown', detail: 'column not mapped' },
      };
    const cell = resolveCell(this.merged, field);
    if (cell.status === 'unmapped')
      return {
        value: this.unknown(`${field} blank in this source`),
        disposition: { status: 'unknown', detail: 'blank cell' },
      };
    if (cell.status === 'disagree')
      return {
        value: this.disagree(field),
        disposition: { status: 'unknown', detail: 'intra-source disagreement' },
      };
    const parsed = /^\d+$/.test(cell.value) ? Number(cell.value) : null;
    if (parsed === null || (!options.allowZero && parsed === 0))
      return {
        value: this.unknown(
          `unusable ${field} value "${cell.value}" (${this.file} row ${cell.line})`,
        ),
        disposition: {
          status: 'unknown',
          detail: `unusable value "${cell.value}"`,
        },
      };
    return {
      value: this.known(parsed),
      disposition: {
        status: 'known',
        detail: `parsed from column "${column}"`,
      },
    };
  }

  measured(
    field: string,
    mapping: { column: string; unit: string } | undefined,
    verifiedUnit: string,
  ): { value: SourcedValue<number>; disposition: FieldDisposition } {
    if (mapping === undefined)
      return {
        value: this.unknown(`${field} column not mapped for this source`),
        disposition: { status: 'unknown', detail: 'column not mapped' },
      };
    if (mapping.unit === 'unverified')
      return {
        value: this.unknown(
          `${field} units unverified for this source; see the source notes`,
        ),
        disposition: { status: 'unknown', detail: 'units unverified' },
      };
    const cell = resolveCell(this.merged, field);
    if (cell.status === 'unmapped')
      return {
        value: this.unknown(`${field} column empty in this source`),
        disposition: { status: 'unknown', detail: 'blank cell' },
      };
    if (cell.status === 'disagree')
      return {
        value: this.disagree(field),
        disposition: { status: 'unknown', detail: 'intra-source disagreement' },
      };
    const parsed = /^\d+(?:\.\d+)?$/.test(cell.value)
      ? Number(cell.value)
      : null;
    if (parsed === null || parsed <= 0)
      return {
        value: this.unknown(
          `unusable ${field} value "${cell.value}" (${this.file} row ${cell.line})`,
        ),
        disposition: {
          status: 'unknown',
          detail: `unusable value "${cell.value}"`,
        },
      };
    return {
      value: this.known(parsed),
      disposition: {
        status: 'known',
        detail: `${verifiedUnit} declared by manifest; parsed from column "${mapping.column}"`,
      },
    };
  }

  list(
    field: string,
    mapping: { column: string; separator: string } | undefined,
  ): { value: SourcedValue<readonly string[]>; disposition: FieldDisposition } {
    if (mapping === undefined)
      return {
        value: this.unknown(`${field} column not mapped for this source`),
        disposition: { status: 'unknown', detail: 'column not mapped' },
      };
    const cell = resolveCell(this.merged, field);
    if (cell.status === 'unmapped')
      return {
        value: this.unknown(`${field} blank in this source`),
        disposition: { status: 'unknown', detail: 'blank cell' },
      };
    if (cell.status === 'disagree')
      return {
        value: this.disagree(field),
        disposition: { status: 'unknown', detail: 'intra-source disagreement' },
      };
    const items = cell.value
      .split(mapping.separator)
      .map((part) => part.trim())
      .filter((part) => part !== '');
    if (items.length === 0)
      return {
        value: this.unknown(
          `${field} blank after splitting (${this.file} row ${cell.line})`,
        ),
        disposition: { status: 'unknown', detail: 'blank after splitting' },
      };
    return {
      value: this.known(items),
      disposition: {
        status: 'known',
        detail: `split by "${mapping.separator}" from column "${mapping.column}"`,
      },
    };
  }
}
