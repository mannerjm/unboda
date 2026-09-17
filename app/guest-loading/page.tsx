"use client";

import MysticLoadingScreen from "@/app/components/MysticLoadingScreen";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuestLoadingPage() {
  const router = useRouter();
  useEffect(() => {
    void fetch("/api/guest-free-analysis/generate", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        router.replace("/guest-result");
      })
      .catch(() => router.replace("/guest-saju"));
  }, [router]);
  return (
    <MysticLoadingScreen
      description="입력한 출생 정보를 바탕으로 사주 구조와 현재 흐름을 읽고, 결과에서 이어질 질문까지 준비하고 있습니다."
    />
  );
}