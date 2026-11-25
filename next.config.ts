import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/supabase-js", "cheerio", "node:sqlite"],
};

export default nextConfig;
