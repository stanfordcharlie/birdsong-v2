"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { bg, border, radius, shadow, text } from "./tokens";

// One line of 15px text is 22px tall, and the send button is 36. The field
// is padded to the button's height so the bar is 52px at rest and the two
// stay level as the text wraps.
const LINE_HEIGHT = 22;
const MAX_LINES = 6;

function SendIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 13V3M4 7l4-4 4 4" />
    </svg>
  );
}

/**
 * The chat input: a 52px bar on the card radius with the input shadow, and
 * the accent send button inside it at the right.
 *
 * Enter sends. Shift+Enter makes a new line, and the bar grows with the
 * text up to six lines before it scrolls. It holds no state of its own: the
 * page owns the value and decides what sending means.
 *
 * Pin it to the bottom of its panel (a shrink-0 sibling under a min-h-0
 * scrolling thread), so it never moves as the conversation grows.
 */
export const ChatInput = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    placeholder?: string;
    /** Names the field for screen readers. */
    label: string;
    /** Stops typing and sending, while a reply is on its way. */
    disabled?: boolean;
    className?: string;
  }
>(({ value, onChange, onSend, placeholder, label, disabled = false, className }, forwardedRef) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

  // Grow with the text. Reset first, or the field could never shrink again.
  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT * MAX_LINES + 14)}px`;
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: Enter that confirms an IME candidate is not a send.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-[52px] items-end gap-[10px] border py-[7px] pl-4 pr-2",
        "focus-within:ring-2 focus-within:ring-[hsl(var(--ds-focus))] focus-within:ring-offset-2",
        radius.card,
        border.base,
        bg.base,
        shadow.input,
        className
      )}
    >
      <textarea
        ref={innerRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "min-w-0 flex-1 resize-none border-0 bg-transparent py-[7px] text-[15px] leading-[22px] outline-none",
          "placeholder:text-[color:hsl(var(--ds-muted-3))] disabled:opacity-60",
          text.ink
        )}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className={cn(
          "focus-ring flex h-9 w-9 shrink-0 items-center justify-center transition-colors",
          "hover:bg-[color:hsl(var(--ds-accent)/0.9)] disabled:pointer-events-none disabled:opacity-50",
          radius.control,
          bg.accent,
          text.onInk
        )}
      >
        <SendIcon />
      </button>
    </div>
  );
});
ChatInput.displayName = "AdminChatInput";
