import type { ReactNode } from "react";

// Assistant messages may mark a key phrase with markdown bold (**like
// this**); render that as real bold instead of showing the raw asterisks.
export function renderWithBold(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
}
