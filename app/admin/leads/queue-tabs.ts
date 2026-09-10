// The lead queue's stage tabs, in a module without the client directive.
//
// The server page needs isQueueTab() to read the ?tab= deep link, and the
// client queue needs the same list to render the tabs. A client-directive module
// cannot supply a plain function to a server component: in production every
// export of such a module is a client reference, and calling one throws
// "is not a function". This file is importable from both sides.

export const QUEUE_TABS = ["all", "unworked", "mine", "contacted", "meetings", "closed"] as const;

export type QueueTab = (typeof QUEUE_TABS)[number];

export function isQueueTab(value: unknown): value is QueueTab {
  return typeof value === "string" && (QUEUE_TABS as readonly string[]).includes(value);
}
