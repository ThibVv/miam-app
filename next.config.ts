import type { NextConfig } from "next";

// Les photos envoyées depuis le téléphone sont servies par le stockage Supabase du projet
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

const nextConfig: NextConfig = {
  images: {
    // Photos des plats : la banque d'images et le stockage du projet, rien d'autre
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/recipe-photos/**" }] : []),
    ],
  },
};

export default nextConfig;
