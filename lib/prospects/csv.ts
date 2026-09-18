// Minimal RFC 4180 CSV, both directions. Written rather than taken from a
// dependency because the need is one import route and one export route, and
// the parts that actually bite (a quoted field containing a comma, a newline
// inside a quoted field, "" as an escaped quote, CRLF, a trailing newline)
// are the parts a hand-rolled split(",") gets wrong. Those are covered here.

// Splits CSV text into rows of raw string cells. Quotes are interpreted;
// nothing is trimmed or coerced, because the caller decides what a cell
// means. A completely empty trailing line is dropped rather than returned as
// a row of one empty cell.
export function parseCsv(text: string): string[][] {
  // Strip a UTF-8 BOM. Excel writes one, and without this the first header
  // becomes "﻿First Name" and matches nothing.
  const input = text.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // A row that is a single empty cell is a blank line, not a record.
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        // "" inside a quoted field is one literal quote.
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      // CRLF and a bare CR both end the row.
      if (input[i + 1] === "\n") i += 1;
      endRow();
      i += 1;
      continue;
    }
    if (char === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Whatever is still buffered when the input ends is the last row, unless
  // the file ended on a newline and there is nothing pending.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

// Quotes a cell only when it needs it. A value containing a quote, comma,
// or newline is wrapped and its quotes doubled; everything else goes out
// bare, which keeps an exported file readable and diffable.
function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Serializes rows to CSV text. CRLF line endings, because the consumer here
// is Excel and Instantly's uploader, both of which are happiest with them.
export function toCsv(rows: (string | null | undefined)[][]): string {
  return rows.map((row) => row.map((cell) => escapeCell(cell ?? "")).join(",")).join("\r\n");
}
