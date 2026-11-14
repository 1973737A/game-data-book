import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 纯静态导出：本站全部页面都是静态的，导出成 HTML 直接托管到 Cloudflare Pages
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
