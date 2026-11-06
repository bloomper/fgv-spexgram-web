const DATE_TIME = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  timeZone: "Europe/Stockholm",
});

/**
 * Formats an instant as yyyy-mm-dd hh:mm in Swedish time, in every language.
 */
export function formatInstant(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : null;
  }

  const parts = Object.fromEntries(DATE_TIME.formatToParts(date).map(part => [part.type, part.value]));

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export type KindName = { nameSv: string; nameEn: string };

/**
 * An album kind's name in the given language: English for "en", otherwise Swedish.
 */
export function kindName(kind: KindName, locale: string): string {
  return locale === "en" ? kind.nameEn : kind.nameSv;
}

const MONTHS: Record<string, string[]> = {
  sv: ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

function parseDay(value: string | null | undefined): [number, number, number] | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;

  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * A day (yyyy-mm-dd, or the date part of a local date-time) in words: "14 februari 1975", "February 14, 1975".
 */
export function formatDay(value: string | null | undefined, locale: string): string | null {
  const day = parseDay(value);

  if (!day) {
    return null;
  }

  const [year, month, date] = day;
  const name = (MONTHS[locale] ?? MONTHS.sv)[month - 1];

  return locale === "en" ? `${name} ${date}, ${year}` : `${date} ${name} ${year}`;
}

/**
 * An album's date: one day, or a period, shortened where the parts are the same ("14–16 februari 1975").
 */
export function formatPeriod(from: string | null | undefined, to: string | null | undefined, locale: string): string | null {
  const start = parseDay(from);
  const end = parseDay(to);

  if (!start) {
    return null;
  }
  if (!end || (start[0] === end[0] && start[1] === end[1] && start[2] === end[2])) {
    return formatDay(from, locale);
  }

  const months = MONTHS[locale] ?? MONTHS.sv;

  if (start[0] === end[0] && start[1] === end[1]) {
    return locale === "en"
      ? `${months[start[1] - 1]} ${start[2]}–${end[2]}, ${start[0]}`
      : `${start[2]}–${end[2]} ${months[start[1] - 1]} ${start[0]}`;
  }
  return `${formatDay(from, locale)} – ${formatDay(to, locale)}`;
}

/**
 * A local date-time from the server (yyyy-mm-ddThh:mm:ss) as yyyy-mm-dd hh:mm, without converting time zones.
 */
export function formatTaken(value: string | null | undefined): string | null {
  const match = value ? /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(value) : null;

  return match ? [match[1], match[2]].filter(Boolean).join(" ") : null;
}

/**
 * A size in bytes as "1,2 GB" in the page's language.
 */
export function formatBytes(bytes: number | null | undefined, locale: string): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "–";
  }

  const units = ["B", "kB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "sv-SE", { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`;
}

/**
 * A video's length as m:ss or h:mm:ss.
 */
export function formatDurationMs(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) {
    return null;
  }

  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}
