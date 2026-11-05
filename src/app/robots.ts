import type { MetadataRoute } from "next";

/**
 * Search engines may index the public side; pages for members and editors say noindex themselves, and these are never
 * crawled.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/manage/", "/admin/", "/stats/", "/map", "/contributions", "/suggestions", "/reports"] }],
  };
}
