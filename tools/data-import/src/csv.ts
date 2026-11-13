export interface CsvRow {
  line: number;
  cells: string[];
}

export class CsvError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(`CSV parse error at line ${line}: ${message}`);
    this.name = 'CsvError';
  }
}

const bom = '﻿';

export function parseCsv(input: string): CsvRow[] {
  const text = input.startsWith(bom) ? input.slice(bom.length) : input;
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  let cellStartLine = 1;
  let line = 1;
  let index = 0;

  const pushCell = () => {
    cells.push(cell);
    cell = '';
  };
  const pushRow = () => {
    pushCell();
    if (!(cells.length === 1 && cells[0] === ''))
      rows.push({ line: cellStartLine, cells });
    cells = [];
  };

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index++;
        continue;
      }
      if (char === '\n') line++;
      cell += char;
      index++;
      continue;
    }
    if (char === '"' && cell === '') {
      inQuotes = true;
      index++;
      continue;
    }
    if (char === ',') {
      pushCell();
      index++;
      continue;
    }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      index++;
      pushRow();
      line++;
      cellStartLine = line;
      continue;
    }
    cell += char;
    index++;
  }
  if (inQuotes) throw new CsvError('Unterminated quoted field', line);
  if (cell !== '' || cells.length > 0) pushRow();
  return rows;
}

export function headerRow(rows: readonly CsvRow[]): CsvRow {
  const header = rows[0];
  if (header === undefined)
    throw new CsvError('CSV input has no header row', 1);
  return header;
}
