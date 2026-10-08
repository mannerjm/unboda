import type { ReactNode } from "react";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: "무료 사주 분석",
  description: "회원가입 없이 생년월일과 출생 정보를 입력하고 내 사주 구조와 현재 흐름을 무료로 확인하세요.",
  path: "/guest-saju",
});

export default function GuestSajuLayout({ children }: { children: ReactNode }) {
  return children;
}
