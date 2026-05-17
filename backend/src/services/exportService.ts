// ===============================================
// 📤 Export Service
// ===============================================
// Serializes datasets to CSV or JSON for download. Kept simple and
// dependency-free — callers stream the returned string to the response.

export type ExportFormat = 'csv' | 'json';

export interface ExportColumn<T> {
    key: string;
    label: string;
    /** Extract a primitive cell value from a row. */
    value: (row: T) => string | number | boolean | null | undefined;
}

function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

/** Build a CSV string. First row is the header. */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
    const header = columns.map((c) => csvEscape(c.label)).join(',');
    const body = rows.map((row) =>
        columns.map((c) => csvEscape(c.value(row))).join(','),
    );
    // Prepend a UTF-8 BOM so Excel renders Hebrew/Cyrillic correctly.
    return '﻿' + [header, ...body].join('\r\n');
}

/** Build a pretty JSON string of projected rows. */
export function toJson<T>(rows: T[], columns: ExportColumn<T>[]): string {
    const projected = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const c of columns) obj[c.key] = c.value(row) ?? null;
        return obj;
    });
    return JSON.stringify(projected, null, 2);
}

export interface ExportPayload {
    body: string;
    contentType: string;
    filename: string;
}

/** Produce a ready-to-send export payload. */
export function buildExport<T>(
    dataset: string,
    rows: T[],
    columns: ExportColumn<T>[],
    format: ExportFormat,
): ExportPayload {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
        return {
            body: toJson(rows, columns),
            contentType: 'application/json; charset=utf-8',
            filename: `${dataset}-${stamp}.json`,
        };
    }
    return {
        body: toCsv(rows, columns),
        contentType: 'text/csv; charset=utf-8',
        filename: `${dataset}-${stamp}.csv`,
    };
}
