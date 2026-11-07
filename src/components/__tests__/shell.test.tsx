import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar.client";
import { SiteHeader } from "@/components/site-header.client";
import { AboutPage } from "@/components/about-page.client";
import { SupportPage } from "@/components/support-page.client";
import { HeaderSearch } from "@/components/header-search.client";
import { LoginButton } from "@/components/login-button.client";
import { NavSecondary } from "@/components/nav-secondary.client";
import { LinkSegments, LinkTabs } from "@/components/link-tabs";
import { DataEmpty } from "@/components/data-empty";
import { HomeSection } from "@/components/home-section";
import { Logo } from "@/components/logo";
import { LogoHome } from "@/components/logo-home";
import { LogoText } from "@/components/logo-text";
import { Umami } from "@/components/umami";
import { AlbumCard, AlbumGrid } from "@/components/gram/album-card";
import { AlbumFilters } from "@/components/gram/album-filters";
import { BrowseChips } from "@/components/gram/browse-chips";
import { Pager } from "@/components/gram/pager";
import { SpexflixHint } from "@/components/gram/spexflix-hint";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import type { AlbumCardFieldsFragment } from "@/gql/graphql";

const mocks = vi.hoisted(() => ({ push: vi.fn(), pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("q=finalen"),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("next/script", () => ({ default: (props: { src: string }) => <script data-src={props.src} /> }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  getLocale: async () => "sv",
}));
vi.mock("@/hooks/use-is-client.client", () => ({ useIsClient: () => true }));
vi.mock("@/components/nav-user.client", () => ({ NavUser: () => <span>nav-user</span> }));
vi.mock("@/components/app-switcher.client", () => ({ AppSwitcher: ({ title }: { title: string }) => <span>{title}</span> }));
vi.mock("@/components/upload/uploads.client", () => ({ UploadIndicator: () => null }));
// Tested in toggles.test.tsx, with the locale provider they need
vi.mock("@/components/language-toggle.client", () => ({ LanguageToggle: () => null }));

const album = (fields: Partial<AlbumCardFieldsFragment> = {}) => ({
  id: "a1", title: "Nobel 1975", dateFrom: "1975-02-14", dateTo: null, place: "Kårhuset", visibility: "MEMBERS", itemCount: 12,
  kind: { id: "k1", nameSv: "Föreställning", nameEn: "Show" }, spex: [],
  cover: { id: "i1", caption: null, type: "PHOTO", width: 4, height: 3, effectiveVisibility: "MEMBERS", media: { thumbnailUrl: "t", previewUrl: "p", expiresAt: "2100-01-01T00:00:00Z" } },
  ...fields,
}) as unknown as AlbumCardFieldsFragment;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/";
  });

  it("shows each role the pages it opens, and visitors the public ones", () => {
    const sidebar = (roles: ("USER" | "EDITOR" | "ADMIN")[], user: { name: string; email: string } | null) => render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar roles={roles} accountUrl="https://auth/account" user={user as never} />
        </SidebarProvider>
      </TooltipProvider>,
    );

    const visitor = sidebar([], null);
    const visitorLinks = screen.getAllByRole("link").length;
    visitor.unmount();

    mocks.pathname = "/manage/albums";
    sidebar(["USER", "EDITOR", "ADMIN"], { name: "Sara", email: "sara@example.org" });
    expect(screen.getAllByRole("link").length).toBeGreaterThan(visitorLinks);
    expect(screen.getByText("nav-user")).toBeInTheDocument();
  });

  it("has a header with the menu button, search and login", async () => {
    render(<TooltipProvider><SidebarProvider><SiteHeader applications={[]} loggedIn={false} /></SidebarProvider></TooltipProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Header.toggleSidebar" }));
    expect(screen.getAllByRole("link", { name: /login/i }).length).toBeGreaterThan(0);
  });

  it("searches from the header", async () => {
    render(<HeaderSearch />);
    const field = screen.getByRole("searchbox");

    expect(field).toHaveValue("finalen");
    await userEvent.clear(field);
    await userEvent.type(field, "kören{enter}");
    expect(mocks.push).toHaveBeenCalledWith("/search?q=k%C3%B6ren");
    await userEvent.clear(field);
    await userEvent.type(field, "{enter}");
    expect(mocks.push).toHaveBeenLastCalledWith("/search");
  });

  it("logs in back to the page", () => {
    mocks.pathname = "/albums/a1";
    render(<><LoginButton /><LoginButton compact size="default" /></>);
    expect(screen.getAllByRole("link")[0].getAttribute("href")).toContain(encodeURIComponent("/albums/a1"));
  });

  it("renders the about and support pages, the secondary links and small pieces", () => {
    render(
      <SidebarProvider>
        <AboutPage feedbackEmail="feedback@example.org" />
        <SupportPage supportEmail="support@example.org" />
        <NavSecondary items={[{ title: "Om", url: "/about", icon: Info }]} />
        <LinkTabs label="Rankning" items={[{ href: "/a", label: "A", active: true }, { href: "/b", label: "B", active: false }]} />
        <LinkSegments label="Typ" items={[{ href: "/c", label: "C", active: false }]} />
        <DataEmpty title="Inget" description="Här finns inget" />
        <HomeSection id="s" title="Senaste" more={{ href: "/albums", label: "Alla" }}>innehåll</HomeSection>
        <Logo /><LogoHome /><LogoText />
        <VisibilityBadge visibility="PUBLIC" /><VisibilityBadge visibility="MEMBERS" /><VisibilityBadge visibility="UNPUBLISHED" />
      </SidebarProvider>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Alla" })).toHaveAttribute("href", "/albums");
    expect(screen.getAllByText(/support@example.org|feedback@example.org/).length).toBeGreaterThan(0);
  });

  it("renders album cards", () => {
    render(<>
      <AlbumCard album={album()} showVisibility />
      <AlbumGrid albums={[album({ id: "a2", cover: null, dateFrom: null, place: null } as never)]} hrefOf={a => `/manage/albums/${a.id}`} />
    </>);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/albums/a1");
    expect(screen.getAllByRole("link")[1]).toHaveAttribute("href", "/manage/albums/a2");
  });
});

describe("server components", () => {
  it("filter albums and keep hidden fields", async () => {
    render(await AlbumFilters({
      path: "/albums", search: { category: "c1", year: "1975" }, categories: [{ id: "c1", name: "Chalmersspexet" }], years: [1975],
      kinds: [{ id: "k1", nameSv: "Fest", nameEn: "Party" }], spex: [{ id: "s1", title: "Nobel", year: 1975, revival: true }],
      editor: true, keep: { q: "kören", spex: undefined },
    }));
    expect(screen.getByLabelText("category")).toHaveValue("c1");
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
    expect(document.querySelector("input[type=hidden][name=q]")).toHaveValue("kören");
  });

  it("filter without anything chosen", async () => {
    render(await AlbumFilters({ path: "/albums", search: {}, categories: [], years: [], kinds: [] }));
    expect(screen.queryByLabelText("spex")).not.toBeInTheDocument();
  });

  it("browse by chips, with more spex than shown", async () => {
    render(await BrowseChips({
      categories: [{ id: "c1", name: "Chalmersspexet", albumCount: 3 }], years: [1975, 1998],
      kinds: [{ id: "k1", nameSv: "Fest", nameEn: "Party", albumCount: 1 }, { id: "k2", nameSv: "Tom", nameEn: "Empty", albumCount: 0 }],
      spex: [{ id: "s1", title: "Nobel", year: 1975, revival: false, albumCount: 2 }, { id: "s2", title: "Ali Baba", year: 2028, revival: true, albumCount: 1 }],
      spexLimit: 1,
    }));
    expect(screen.getByRole("link", { name: /Chalmersspexet/ })).toHaveAttribute("href", "/albums?category=c1");
    expect(screen.queryByText("Tom")).not.toBeInTheDocument();
  });

  it("page", async () => {
    const { container } = render(<>{await Pager({ page: 0, pages: 1, hrefOf: page => `?page=${page}` })}</>);

    expect(container).toBeEmptyDOMElement();
    render(await Pager({ page: 1, pages: 3, hrefOf: page => `?page=${page}` }) as React.ReactElement);
    expect(screen.getByRole("link", { name: "previousPage" })).toHaveAttribute("href", "?page=0");
    expect(screen.getByRole("link", { name: "nextPage" })).toHaveAttribute("href", "?page=2");
  });

  it("point long videos to Spexflix", async () => {
    vi.stubEnv("SPEXFLIX_WEB_URL", "https://spexflix.example.org/");
    render(await SpexflixHint({ maxMinutes: 10 }));
    expect(screen.getByRole("link", { name: "Spexflix" })).toHaveAttribute("href", "https://spexflix.example.org");
  });

  it("load Umami only when it is configured", async () => {
    expect(await Umami()).toBeNull();
    vi.stubEnv("UMAMI_URL", "http://umami");
    vi.stubEnv("UMAMI_WEBSITE_ID", "w1");
    render(await Umami() as React.ReactElement);
    expect(document.querySelector("script[data-src='/stats/script.js']")).not.toBeNull();
  });
});
