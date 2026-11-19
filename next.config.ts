import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    devIndicators: false,
    images: {
        unoptimized: true,
    },
    // The old sign-language dictionary became the glossary. Not permanent, so the path stays free.
    async redirects() {
        return [{ source: "/tunarungu/isyarat", destination: "/tunarungu/istilah", permanent: false }];
    },
};

export default nextConfig;
