"use client";

import * as React from "react";

/**
 * Dropping a file onto a page: the drag state and the file check.
 *
 * Generic on purpose (`accept`, `maxSize`, `onFile`): this knows nothing about
 * CSVs or prospects. The caller passes what it takes and gets a File back, so
 * the drop can hand that File to whatever the caller's own button already
 * calls. Nothing here uploads anything.
 */

export type FileDropAccept = {
  /** Lower-case, with the dot: [".csv"]. The reliable half of the test. */
  extensions: readonly string[];
  /**
   * Types that may pass. Include "" to allow a file whose type the browser
   * could not guess, which is common enough that rejecting it would refuse
   * valid files.
   */
  mimeTypes: readonly string[];
};

export type FileDropValidation =
  | { ok: true; file: File }
  | { ok: false; reason: "multiple" | "type" | "size" | "empty" | "none" };

/**
 * One file, of an accepted type, within the size cap. Exported so a caller
 * can run the same check on a file that came from a file input, which is what
 * keeps the two entry points telling the user the same thing.
 */
export function validateFileDrop(
  files: readonly File[],
  { accept, maxSize }: { accept: FileDropAccept; maxSize: number }
): FileDropValidation {
  if (files.length === 0) return { ok: false, reason: "none" };
  if (files.length > 1) return { ok: false, reason: "multiple" };

  const file = files[0];
  const name = file.name.toLowerCase();
  const extensionOk = accept.extensions.some((extension) => name.endsWith(extension));
  const mimeOk = accept.mimeTypes.includes(file.type);
  // Both have to hold. The extension is what a person chose; the MIME type
  // can still catch a .csv that is really something else renamed.
  if (!extensionOk || !mimeOk) return { ok: false, reason: "type" };

  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > maxSize) return { ok: false, reason: "size" };
  return { ok: true, file };
}

/** True when a drag is carrying files, rather than selected text or a link. */
function carriesFiles(transfer: DataTransfer | null): boolean {
  if (!transfer) return false;
  // `types` is the only thing readable during dragover and dragenter; `items`
  // and `files` are empty until the drop in most browsers.
  return Array.from(transfer.types).includes("Files");
}

export function useFileDrop({
  accept,
  maxSize,
  onFile,
  onReject,
  disabled = false,
}: {
  accept: FileDropAccept;
  maxSize: number;
  onFile: (file: File) => void;
  /** Called with the reason a drop was refused, for the caller's own copy. */
  onReject: (reason: Exclude<FileDropValidation, { ok: true }>["reason"]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = React.useState(false);
  // dragenter and dragleave both fire as the pointer crosses every child
  // element, so a boolean flickers. Counting entries against leaves is what
  // makes the overlay steady over a page full of rows.
  const depth = React.useRef(0);

  const reset = React.useCallback(() => {
    depth.current = 0;
    setDragging(false);
  }, []);

  // A file dropped anywhere the handlers below do not cover would otherwise
  // navigate the tab to the file. Cancelled at the document, for file drags
  // only, so dragging text inside an input still behaves normally.
  React.useEffect(() => {
    function cancel(event: DragEvent) {
      if (carriesFiles(event.dataTransfer)) event.preventDefault();
    }
    function onDrop(event: DragEvent) {
      if (carriesFiles(event.dataTransfer)) {
        event.preventDefault();
        reset();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") reset();
    }
    document.addEventListener("dragover", cancel);
    document.addEventListener("drop", onDrop);
    document.addEventListener("dragend", reset);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("dragover", cancel);
      document.removeEventListener("drop", onDrop);
      document.removeEventListener("dragend", reset);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [reset]);

  const handlers = {
    onDragEnter(event: React.DragEvent) {
      if (disabled || !carriesFiles(event.dataTransfer)) return;
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragOver(event: React.DragEvent) {
      if (disabled || !carriesFiles(event.dataTransfer)) return;
      // Without this the drop event never fires at all.
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(event: React.DragEvent) {
      if (disabled || !carriesFiles(event.dataTransfer)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop(event: React.DragEvent) {
      if (disabled || !carriesFiles(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      reset();
      const result = validateFileDrop(Array.from(event.dataTransfer.files), { accept, maxSize });
      if (result.ok) onFile(result.file);
      else onReject(result.reason);
    },
  };

  return { dragging, handlers };
}
