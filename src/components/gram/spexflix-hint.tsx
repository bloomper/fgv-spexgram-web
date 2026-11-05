import { getTranslations } from "next-intl/server";

/**
 * Tells uploaders that longer videos belong in Spexflix, with a link when its address is known.
 */
export async function SpexflixHint({ maxMinutes }: { maxMinutes: number }) {
  const t = await getTranslations("Uploads");
  const url = process.env.SPEXFLIX_WEB_URL?.trim().replace(/\/+$/, "");

  return (
    <span>
      {t("longVideos", { minutes: maxMinutes })}{" "}
      {url && <a href={url} className="text-primary underline" target="_blank" rel="noopener noreferrer">Spexflix</a>}
    </span>
  );
}
