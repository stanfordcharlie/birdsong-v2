"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function OverflowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

const MENU_WIDTH = 190;

// Row-level overflow menu for the surveys list: archive/unarchive (both
// reversible, just toggle archived_at) and permanent delete (irreversible,
// hard-deletes the row — only offered once the survey has zero real
// responses, and the API independently re-checks that before deleting).
// Portalled to document.body rather than positioned inline: the surveys
// table sits inside a Card with overflow-hidden and the Table primitive
// itself wraps in overflow-auto, either of which would clip an
// absolutely-positioned menu anchored inside a row.
export function SurveyRowActions({
  surveyId,
  internalName,
  slug,
  status,
  archivedAt,
  responseCount,
}: {
  surveyId: string;
  internalName: string;
  // Public respondent slug, used to build the share link the copy item puts
  // on the clipboard.
  slug: string;
  status: string;
  archivedAt: string | null;
  responseCount: number;
}) {
  const router = useRouter();
  const isArchived = archivedAt !== null;
  const canDelete = responseCount === 0;
  // An archived survey's link only ever renders the closed screen, so there
  // is nothing worth sharing. A draft's link is real but not answerable yet,
  // which the item says on hover rather than by hiding itself: preparing a
  // link before flipping a survey live is a normal thing to want.
  const canCopyLink = !isArchived;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // "idle" until the link is on the clipboard, then "copied" (or "error" if
  // the browser refused). The menu stays open for a beat afterwards so the
  // confirmation is actually seen, then closes itself.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCopyState("idle");
    const left = Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8);
    setMenuPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onScrollOrResize() {
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [menuOpen]);

  // Closes the menu a beat after a copy, so the "Copied" label lands before
  // the menu goes away. Cleared if the menu is dismissed first.
  useEffect(() => {
    if (copyState === "idle" || !menuOpen) return;
    const timer = setTimeout(() => setMenuOpen(false), 900);
    return () => clearTimeout(timer);
  }, [copyState, menuOpen]);

  async function copyLink() {
    // Built here rather than on mount: this component only ever runs in the
    // browser after a click, so window.location is always available and
    // there is no server-rendered markup to keep in agreement.
    const url = `${window.location.origin}/survey/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      // Clipboard access can be refused outright (an insecure origin, or a
      // browser permission prompt that was denied). Saying so beats a menu
      // item that silently does nothing.
      setCopyState("error");
    }
  }

  async function patchArchived(action: "archive" | "unarchive") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong");
      setArchiveDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function deleteSurvey() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong");
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Survey actions"
        onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
      >
        <OverflowIcon />
      </button>

      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
            className="z-[100] rounded-card border border-border bg-card p-1.5 shadow-lg"
          >
            {canCopyLink && (
              <button
                type="button"
                role="menuitem"
                onClick={copyLink}
                title={
                  status === "live"
                    ? undefined
                    : "This link starts working once the survey is live"
                }
                className="focus-ring block w-full rounded-control px-3 py-2 text-left font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary"
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "error"
                    ? "Copy failed"
                    : "Copy link"}
              </button>
            )}
            {isArchived ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  patchArchived("unarchive");
                }}
                className="focus-ring block w-full rounded-control px-3 py-2 text-left font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary"
              >
                Unarchive
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setError(null);
                  setArchiveDialogOpen(true);
                }}
                className="focus-ring block w-full rounded-control px-3 py-2 text-left font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary"
              >
                Archive
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setError(null);
                  setConfirmName("");
                  setDeleteDialogOpen(true);
                }}
                className="focus-ring block w-full rounded-control px-3 py-2 text-left font-archivo text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                Delete permanently
              </button>
            )}
          </div>,
          document.body
        )}

      <Dialog
        open={archiveDialogOpen}
        onClose={() => !pending && setArchiveDialogOpen(false)}
        title="Archive this survey?"
        description={`"${internalName}" will be hidden from your default surveys list and stop accepting new responses. Existing responses stay exactly where they are, and you can unarchive it any time.`}
      >
        <div className="flex flex-col gap-3">
          {error && <p className="type-body text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setArchiveDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => patchArchived("archive")} disabled={pending}>
              {pending ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !pending && setDeleteDialogOpen(false)}
        title="Delete this survey permanently?"
        description={`This can't be undone. Type the internal name to confirm: "${internalName}"`}
      >
        <div className="flex flex-col gap-3">
          <Input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={internalName}
            autoFocus
            className={cn(confirmName && confirmName !== internalName && "border-destructive")}
          />
          {error && <p className="type-body text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteSurvey}
              disabled={pending || confirmName !== internalName}
            >
              {pending ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
