import type { MetadataRoute } from "next";

/** Keep private areas out of search engines. (Access itself is enforced by auth, not by this file.) */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/organizer", "/api/", "/tickets/success", "/partner/", "/login", "/signup"],
    },
  };
}
