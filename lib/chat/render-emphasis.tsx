import type { ReactNode } from "react";
import { emphasisSegments, extractEmphasis } from "./emphasis";

// One interviewer message as React nodes: the emphasis phrase bold in place
// when it appears in the text, plain text otherwise. The transcript surfaces
// (the respondent's "Your responses" list, the admin live transcript) use
// this; the question screen applies the same segments with its own marker
// styling. Not for the creator-side chats, whose assistant messages use
// ordinary markdown bold that renderWithBold handles.
export function renderEmphasis(message: string): ReactNode[] {
  const { text, phrase } = extractEmphasis(message);
  return emphasisSegments(text, phrase).map((segment, i) =>
    segment.bold ? <strong key={i}>{segment.text}</strong> : segment.text
  );
}
