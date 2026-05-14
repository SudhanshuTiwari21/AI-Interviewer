/** Human-readable ticket status for UI (e.g. in_progress → In progress). */
export function formatTicketStatus(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatTicketPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
}
