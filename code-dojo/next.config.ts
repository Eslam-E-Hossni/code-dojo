import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  /**
   * The Sandpack bundler (the React live preview) is built to live at the
   * root of a site: it asks for /static/... and /<name>.worker.js. Its files
   * are in public/sandpack, so those two kinds of request are sent there.
   * Its service worker files are deliberately not served.
   */
  async rewrites() {
    return [
      { source: "/static/:path*", destination: "/sandpack/static/:path*" },
      { source: "/:worker((?!sw\\.)[^/]+\\.worker\\.js)", destination: "/sandpack/:worker" },
    ];
  },
};

export default nextConfig;
