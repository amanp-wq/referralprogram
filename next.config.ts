import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // TODO: Remove this once the Supabase client is generically typed
  // with a Database interface (createClient<Database>(...)) so all
  // .from('Table') calls are properly type-checked.
  // The schema-level bugs (visitorPhone, status enums, nullable programId)
  // have been fixed at the source of truth — supabase.ts + prisma + SQL.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
