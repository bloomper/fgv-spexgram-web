import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { normalizeLocale } from "@/utils/utils.server";
import { normalizeTheme, returnPath } from "@/utils/auth";

/**
 * Starts signing in with Keycloak, showing its pages in the user's language and theme, and comes back to `returnTo`.
 * With `silent=1`, which the app switcher of the other FGV applications uses, it only asks Keycloak whether the user is
 * already logged in (`prompt=none`) and comes back either way; someone already logged in here goes straight back.
 */
export const GET = async (req: NextRequest) => {
  const silent = req.nextUrl.searchParams.get("silent") === "1";
  const back = returnPath(req.nextUrl.searchParams.get("returnTo"));

  if (silent && (await auth.api.getSession({ headers: req.headers }))) {
    redirect(back);
  }

  const cookieLocale = req.cookies.get("locale")?.value;
  const locale = normalizeLocale(cookieLocale);

  const cookieTheme = req.cookies.get("theme")?.value;
  const theme = normalizeTheme(cookieTheme);

  const { url } = await auth.api.signInSocial({
    body: {
      provider: "keycloak",
      callbackURL: back,
      ...(silent ? { errorCallbackURL: `/api/auth/login-error?silent=1&returnTo=${encodeURIComponent(back)}` } : {}),
      additionalParams: {
        ui_locales: locale,
        ...(theme ? { theme } : {}),
        ...(silent ? { prompt: "none" } : {}),
      },
    },
  });

  if (!url) {
    throw new Error("Keycloak did not return an authorization URL");
  }

  redirect(url);
};
