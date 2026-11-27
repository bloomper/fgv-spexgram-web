import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Memories } from "@/components/gram/memories.client";
import { HomeSection } from "@/components/home-section";
import { getMemories } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { Page } from "@bloomper/fgv-web-ui/shell/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
    // No image: the application has no picture of its own (only the FGV logo, for the manifest)
    openGraph: { title: t("title"), description: t("description"), type: "website", siteName: "Spexgram" },
  };
}

/**
 * The home page: the welcome text (the administrators' own, else the standard one), then memories (this day in
 * earlier years, albums of spex whose premiere is near today) and the ways into the archive. Visitors see what is public.
 */
export default async function HomePage() {
  const t = await getTranslations("Home");
  const [memories, viewer] = await Promise.all([getMemories(), getViewer()]);
  const welcome = memories?.startPage.welcome;
  const contactEmail = memories?.startPage.contactEmail;
  const options = { canDownloadOriginals: false, report: viewer.report, editor: viewer.editor };
  const links = [
    { href: "/photos", title: t("photos"), text: t("photosText") },
    { href: "/explore", title: t("explore"), text: t("exploreText") },
    { href: "/albums", title: t("albums"), text: t("albumsText") },
  ];

  return (
    <Page variant="content">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground max-w-4xl text-pretty whitespace-pre-line">
          {welcome || (viewer.member ? t("intro") : t("introVisitor"))}
        </p>
        {contactEmail && (
          <p className="text-muted-foreground text-sm">
            {t("contact")}{" "}
            <a
              className="text-link hover:text-link/80"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>
          </p>
        )}
      </section>
      {memories && (
        <Memories
          thisDay={memories.thisDayInHistory}
          premiereAlbums={memories.premiereAlbums}
          options={options}
          now={new Date().toISOString()}
        />
      )}
      <HomeSection
        id="home-browse"
        title={t("browse")}
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:bg-accent block h-full rounded-lg border p-4 transition-colors"
              >
                <span className="font-medium">{link.title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">{link.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </HomeSection>
    </Page>
  );
}
