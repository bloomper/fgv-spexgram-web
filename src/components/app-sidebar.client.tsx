"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  BookImage,
  Compass,
  Drama,
  FolderPlus,
  Heart,
  House,
  Image as ImageIcon,
  Map,
  type LucideIcon,
  Pencil,
  Search,
  Settings,
  Upload,
  Flag,
  Wrench,
} from "lucide-react";

import { NavMain } from "@bloomper/fgv-web-ui/shell/nav-main";
import { NavSecondary, SidebarBrand } from "@bloomper/fgv-web-ui/shell/sidebar-parts";
import { NavUser, type SessionUser } from "@/components/nav-user.client";
import { LoginButton } from "@/components/login-button.client";
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from "@bloomper/fgv-web-ui/ui/sidebar";
import { Role } from "@/types/auth";
import { hasAccess, isAdmin, isEditor } from "@/utils/auth";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIsClient } from "@bloomper/fgv-web-ui/hooks/use-is-client";

interface NavLink {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavLink[];
}

/** A group without an address only opens and closes its entries. */
interface NavItem extends Omit<NavLink, "url"> {
  url?: string;
}

interface NavSecondaryItem extends Omit<NavLink, "icon"> {
  icon: LucideIcon;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  roles: Role[];
  accountUrl: string;
  /** Null for visitors. */
  user: SessionUser | null;
}

export function AppSidebar({ roles, accountUrl, user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const isClient = useIsClient();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeOnNavigate = (event: React.MouseEvent) => {
    if (isMobile && (event.target as Element).closest("a")) {
      setOpenMobile(false);
    }
  };

  const navigation = useMemo((): { main: NavItem[]; secondary: NavSecondaryItem[] } => {
    const mainItems: NavItem[] = [
      { title: t("Nav.home"), url: "/", icon: House, isActive: pathname === "/" },
      {
        title: t("Nav.photos"),
        url: "/photos",
        icon: ImageIcon,
        isActive: pathname.startsWith("/photos") || pathname.startsWith("/items"),
      },
      {
        title: t("Nav.explore"),
        url: "/explore",
        icon: Compass,
        isActive: pathname.startsWith("/explore") || pathname.startsWith("/spex"),
      },
      { title: t("Nav.albums"), url: "/albums", icon: BookImage, isActive: pathname.startsWith("/albums") },
      { title: t("Nav.search"), url: "/search", icon: Search, isActive: pathname.startsWith("/search") },
    ];

    // Members' pages are left out for visitors; typed in, they ask them to log in
    if (hasAccess(roles)) {
      mainItems.splice(1, 0, {
        title: t("Nav.favourites"),
        url: "/favourites",
        icon: Heart,
        isActive: pathname.startsWith("/favourites"),
      });
      mainItems.push(
        { title: t("Nav.map"), url: "/map", icon: Map, isActive: pathname.startsWith("/map") },
        {
          title: t("Nav.contributions"),
          url: "/contributions",
          icon: Upload,
          isActive: pathname.startsWith("/contributions"),
        },
        {
          title: t("Nav.suggest"),
          url: "/suggestions",
          icon: FolderPlus,
          isActive: pathname.startsWith("/suggestions"),
        },
        { title: t("Nav.reports"), url: "/reports", icon: Flag, isActive: pathname.startsWith("/reports") }
      );
    }

    if (isEditor(roles)) {
      mainItems.push({
        title: t("Nav.manage"),
        icon: Pencil,
        isActive: pathname.startsWith("/manage"),
        items: [
          { title: t("Nav.manageAlbums"), url: "/manage/albums" },
          { title: t("Nav.manageContributions"), url: "/manage/contributions" },
          { title: t("Nav.manageReports"), url: "/manage/reports" },
          { title: t("Nav.unsorted"), url: "/manage/unsorted" },
          { title: t("Nav.trash"), url: "/manage/trash" },
          { title: t("Nav.auditLog"), url: "/manage/audit" },
        ],
      });
    }

    if (isAdmin(roles)) {
      mainItems.push({
        title: t("Nav.admin"),
        icon: Settings,
        isActive: pathname.startsWith("/admin/"),
        items: [
          { title: t("Nav.adminSettings"), url: "/admin/settings" },
          { title: t("Nav.adminKinds"), url: "/admin/kinds" },
          { title: t("Nav.adminImmich"), url: "/admin/immich" },
          { title: t("Nav.adminMaintenance"), url: "/admin/maintenance" },
        ],
      });
    }

    return {
      main: mainItems,
      secondary: [
        {
          title: t("Support.title"),
          url: "/support",
          icon: Wrench,
        },
        {
          title: t("About.title"),
          url: "/about",
          icon: Drama,
        },
      ],
    };
  }, [roles, pathname, t]);

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarBrand />
      <SidebarContent onClickCapture={closeOnNavigate}>
        {isClient ? (
          <>
            <NavMain items={navigation.main} />
            <NavSecondary
              items={navigation.secondary}
              className="mt-auto"
            />
          </>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-2 py-1.5"
              >
                <div className="bg-sidebar-accent/50 size-4 shrink-0 animate-pulse rounded" />
                <div className="bg-sidebar-accent/50 h-3 w-24 animate-pulse rounded group-data-[collapsible=icon]:hidden" />
              </div>
            ))}
          </div>
        )}
      </SidebarContent>
      <SidebarFooter onClickCapture={closeOnNavigate}>
        {isClient &&
          (user ? (
            <NavUser
              accountUrl={accountUrl}
              user={user}
            />
          ) : (
            <div className="p-2 group-data-[collapsible=icon]:hidden">
              <LoginButton />
            </div>
          ))}
      </SidebarFooter>
    </Sidebar>
  );
}
