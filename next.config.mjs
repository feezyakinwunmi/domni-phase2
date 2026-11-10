/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Belt and braces: even if a private URL leaks, tell crawlers never to index it.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return ["/admin/:path*", "/dashboard/:path*", "/organizer/:path*", "/api/:path*", "/tickets/success", "/partner/:path*"].map(
      (source) => ({ source, headers: noindex })
    );
  },
};

export default nextConfig;
