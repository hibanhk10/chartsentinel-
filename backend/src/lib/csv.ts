import type { Response } from 'express';

// Minimal, RFC 4180-ish CSV writer used by the admin exports and the
// signals export endpoint. Quote every field, escape embedded quotes by
// doubling them, join fields with commas and rows with CRLF. If we ever
// need streaming or proper RFC compliance, swap to csv-stringify; for
// the volumes we currently emit (a few thousand rows max) this is fine.

export function csvEscape(value: unknown): string {
  if (value == null) return '""';
  const str = value instanceof Date ? value.toISOString() : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvEscape).join(',');
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  return `${head}\r\n${body}\r\n`;
}

export function sendCsv(res: Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}
