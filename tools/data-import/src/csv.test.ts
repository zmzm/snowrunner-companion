import { describe, expect, it } from 'vitest';
import { CsvError, parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows and skips blank lines', () => {
    const rows = parseCsv('a,b,c\n1,2,3\n\n4,5,6\n');
    expect(rows.map((row) => row.cells)).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });
  it('supports LF, CRLF, and CR line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r').map((row) => row.cells)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('parses quoted fields with commas, escaped quotes, and embedded newlines', () => {
    const rows = parseCsv('"a,b","say ""hi""","line1\nline2",plain');
    expect(rows[0]?.cells).toEqual([
      'a,b',
      'say "hi"',
      'line1\nline2',
      'plain',
    ]);
  });
  it('keeps a trailing empty cell and reports physical line numbers', () => {
    const rows = parseCsv('h1,h2,h3\n\n"multi\nline",x,');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.line).toBe(1);
    expect(rows[1]?.line).toBe(3);
    expect(rows[1]?.cells).toEqual(['multi\nline', 'x', '']);
  });
  it('rejects unterminated quoted fields with a line number', () => {
    expect(() => parseCsv('a,b\n"unterminated, x')).toThrow(CsvError);
    try {
      parseCsv('a,b\n"unterminated');
    } catch (error) {
      expect(error).toBeInstanceOf(CsvError);
      const csvError = error as CsvError;
      expect(csvError.line).toBe(2);
    }
  });
  it('strips a leading byte-order mark', () => {
    const rows = parseCsv('﻿a,b\n1,2');
    expect(rows[0]?.cells).toEqual(['a', 'b']);
  });
});
