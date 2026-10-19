import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse"],
  env: {
    // Flag publik bahwa unggahan memakai Vercel Blob (client-side).
    // Nilai sebenarnya (token) tidak pernah diekspos ke browser.
    NEXT_PUBLIC_BLOB_UPLOAD_ENABLED: process.env.BLOB_READ_WRITE_TOKEN ? "1" : "0",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
