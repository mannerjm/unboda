import { redirect } from "next/navigation";
import { buildPublicMetadata } from "@/app/lib/seo";

// Keep the legacy professional-analysis URL working for bookmarks, navigation
// and discovery links while removing the redundant intermediate hub screen.
export const metadata = buildPublicMetadata({
  title: "전문 분석",
  description: "한 사람의 운세를 넘어 두 사람의 관계와 중요한 시기처럼 더 구체적인 주제를 살펴보는 운보다 전문 분석입니다.",
  path: "/special-analysis",
});

export default function SpecialAnalysisPage() {
  redirect("/special-analysis/compatibility");
}
