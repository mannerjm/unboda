import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "운보다 | AI 사주·명리 분석",
    short_name: "운보다",
    description: "나를 기억하는 AI 운세 상담과 맞춤 사주 분석",
    lang: "ko-KR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#070d20",
    theme_color: "#10162d",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/unboda-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
