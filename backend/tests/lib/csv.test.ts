import { describe, expect, it } from 'vitest';
import { csvEscape, toCsv } from '../../src/lib/csv';

describe('csvEscape', () => {
  it('quotes plain values', () => {
    expect(csvEscape('hello')).toBe('"hello"');
  });

  it('renders null/undefined as an empty quoted field', () => {
    expect(csvEscape(null)).toBe('""');
    expect(csvEscape(undefined)).toBe('""');
  });

  it('doubles internal quotes', () => {
    expect(csvEscape('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('serialises Date to ISO string', () => {
    const d = new Date('2026-01-02T03:04:05.000Z');
    expect(csvEscape(d)).toBe('"2026-01-02T03:04:05.000Z"');
  });
});

describe('toCsv', () => {
  it('emits CRLF-terminated rows with a trailing newline', () => {
    const out = toCsv(['a', 'b'], [
      [1, 2],
      [3, 4],
    ]);
    expect(out).toBe('"a","b"\r\n"1","2"\r\n"3","4"\r\n');
  });
});
