import { describe, expect, it } from "vitest";
import { validateFileDrop } from "./useFileDrop";
import { CSV_ACCEPT, MAX_IMPORT_FILE_BYTES } from "@/lib/prospects/import-limits";

// The file check behind both ways into the prospect import: the Import CSV
// button and a file dropped on the page run this same function, so what it
// accepts is what either entry point accepts.

const CSV = { accept: CSV_ACCEPT, maxSize: MAX_IMPORT_FILE_BYTES };

function file(name: string, type: string, size = 12): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateFileDrop", () => {
  it("takes one CSV", () => {
    const csv = file("apollo-export.csv", "text/csv");
    expect(validateFileDrop([csv], CSV)).toEqual({ ok: true, file: csv });
  });

  it("takes a CSV whose type the browser could not guess, or guessed as Excel", () => {
    // Both are real: an empty type comes from drags the browser cannot sniff,
    // and Windows reports .csv as application/vnd.ms-excel.
    expect(validateFileDrop([file("list.csv", "")], CSV).ok).toBe(true);
    expect(validateFileDrop([file("list.csv", "application/vnd.ms-excel")], CSV).ok).toBe(true);
    expect(validateFileDrop([file("LIST.CSV", "text/csv")], CSV).ok).toBe(true);
  });

  it("refuses a file that is not a CSV", () => {
    expect(validateFileDrop([file("book.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")], CSV)).toEqual({
      ok: false,
      reason: "type",
    });
    expect(validateFileDrop([file("notes.pdf", "application/pdf")], CSV)).toMatchObject({ reason: "type" });
    // A spreadsheet renamed .csv is caught by its type, not its name.
    expect(
      validateFileDrop(
        [file("renamed.csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")],
        CSV
      )
    ).toMatchObject({ reason: "type" });
  });

  it("refuses more than one file, and no file", () => {
    expect(validateFileDrop([file("a.csv", "text/csv"), file("b.csv", "text/csv")], CSV)).toEqual({
      ok: false,
      reason: "multiple",
    });
    expect(validateFileDrop([], CSV)).toEqual({ ok: false, reason: "none" });
  });

  it("refuses an empty file and one over the cap", () => {
    expect(validateFileDrop([file("empty.csv", "text/csv", 0)], CSV)).toEqual({ ok: false, reason: "empty" });
    expect(validateFileDrop([file("huge.csv", "text/csv", MAX_IMPORT_FILE_BYTES + 1)], CSV)).toEqual({
      ok: false,
      reason: "size",
    });
    // The cap itself passes: the route's check is `>`, and so is this one.
    expect(validateFileDrop([file("exact.csv", "text/csv", MAX_IMPORT_FILE_BYTES)], CSV).ok).toBe(true);
  });
});
