import type { Metadata } from "next";

export const SITE_ORIGIN = "https://unboda.kr";
export const SITE_URL = new URL(SITE_ORIGIN);
export const SITE_NAME = "운보다";
export const DEFAULT_SITE_TITLE = "운보다 | AI 사주·명리 분석";
export const DEFAULT_SITE_DESCRIPTION =
  "무료 사주 분석부터 57개 심층 분석, 궁합 리포트와 구매 결과 기반 AI 상담까지 이어지는 개인 맞춤 명리 서비스.";

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
};

export function buildPublicMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PublicMetadataInput): Metadata {
  const brandedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: path,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      url: path,
      title: absoluteTitle ? title : brandedTitle,
      description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: absoluteTitle ? title : brandedTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
