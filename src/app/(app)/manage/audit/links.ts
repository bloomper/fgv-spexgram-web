/** The kinds of record Spexgram's change log has. */
export const ENTITY_TYPES = ["ALBUM", "ITEM", "ALBUM_KIND", "REPORT", "SETTINGS", "TRASH"] as const;

/**
 * Where a record in the change log can be seen.
 */
export function auditLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "ALBUM":
      return `/manage/albums/${entityId}`;
    case "ITEM":
      return `/items/${entityId}`;
    case "ALBUM_KIND":
      return "/admin/kinds";
    case "REPORT":
      return "/manage/reports";
    case "SETTINGS":
      return "/admin/settings";
    default:
      return null;
  }
}
