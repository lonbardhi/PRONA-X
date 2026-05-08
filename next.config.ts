import type { NextConfig } from "next";

function getSupabaseHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseHostname();

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
];

if (supabaseHostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHostname,
    pathname: "/storage/v1/object/public/property-media/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
