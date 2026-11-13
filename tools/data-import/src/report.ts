export type FieldDisposition = {
  status: 'known' | 'unknown' | 'conflict';
  detail: string;
};

export interface NormalizationReport {
  manifestVersion: 1;
  datasetVersion: string;
  inputs: { file: string; sha256: string; rows: number }[];
  canonicalIds: {
    file: string;
    row: number;
    input: string;
    canonical: string;
  }[];
  unmappedColumns: { file: string; columns: string[] }[];
  discardedRows: { file: string; row: number; reason: string }[];
  inconsistencies: {
    file: string;
    rows: number[];
    field: string;
    values: string[];
    resolution: string;
  }[];
  entities: {
    trucks: {
      id: string;
      row: number;
      fields: Record<string, FieldDisposition>;
    }[];
    components: {
      id: string;
      kind: string;
      row: number;
      fields: Record<string, FieldDisposition>;
    }[];
  };
}

export interface ImportFile {
  content: string;
  sha256: string;
}

export type DatasetValidation =
  { ok: true } | { ok: false; issues: readonly string[] };

export type ImportReport = NormalizationReport & {
  datasetValidation: DatasetValidation;
};
