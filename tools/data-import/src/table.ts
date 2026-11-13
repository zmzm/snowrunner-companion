import { headerRow, parseCsv } from './csv';
import { ImportFormatError } from './errors';
import type { ImportFile, NormalizationReport } from './report';

export type ColumnMappings = Readonly<
  Record<string, string | { column: string } | undefined>
>;
export function mappingColumn(
  mapping: string | { column: string } | undefined,
): string | undefined {
  if (mapping === undefined) return undefined;
  return typeof mapping === 'string' ? mapping : mapping.column;
}

interface DataRow {
  line: number;
  cells: Record<string, string>;
}

export function requireFile(
  files: ReadonlyMap<string, ImportFile>,
  path: string,
): ImportFile {
  const file = files.get(path);
  if (file === undefined)
    throw new ImportFormatError(
      `Manifest references missing file content for "${path}"`,
    );
  return file;
}

export function readTabRows(
  file: ImportFile,
  path: string,
  columns: ColumnMappings,
  report: NormalizationReport,
): DataRow[] {
  const csvRows = parseCsv(file.content);
  const header = headerRow(csvRows);
  const seen = new Set<string>();
  const duplicates = header.cells.filter((column) => {
    if (seen.has(column)) return true;
    seen.add(column);
    return false;
  });
  if (duplicates.length > 0)
    throw new ImportFormatError(
      `${path}: duplicate CSV header(s) ${duplicates.map((column) => `"${column}"`).join(', ')}`,
    );
  const mapped = new Set(
    Object.values(columns)
      .map((mapping) => mappingColumn(mapping))
      .filter(
        (column): column is string => column !== undefined && column !== '',
      ),
  );
  const missing = [...mapped].filter((column) => !seen.has(column));
  if (missing.length > 0)
    throw new ImportFormatError(
      `${path}: mapped column(s) ${missing.map((column) => `"${column}"`).join(', ')} not present in the CSV header`,
    );
  const unmapped = header.cells.filter((column) => !mapped.has(column));
  if (unmapped.length > 0)
    report.unmappedColumns.push({ file: path, columns: unmapped });
  const dataRows: DataRow[] = csvRows.slice(1).map((row) => ({
    line: row.line,
    cells: Object.fromEntries(
      header.cells.map((column, index) => [column, row.cells[index] ?? '']),
    ),
  }));
  report.inputs.push({
    file: path,
    sha256: file.sha256,
    rows: dataRows.length,
  });
  return dataRows;
}
