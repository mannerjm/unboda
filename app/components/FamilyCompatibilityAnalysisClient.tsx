"use client";

import { useState } from "react";
import FamilyParentChildAnalysisClient from "@/app/components/FamilyParentChildAnalysisClient";

type FamilyRelationshipType = "parent_child" | "siblings" | "other_family";

type FamilyRelationshipOption = {
  value: FamilyRelationshipType;
  title: string;
  description: string;
  available: boolean;
};

const RELATIONSHIP_OPTIONS: readonly FamilyRelationshipOption[] = [
  {
    value: "parent_child",
    title: "부모·자녀",
    description: "보호와 독립, 기대와 경계, 대화와 회복을 부모와 자녀의 방향을 나누어 살펴봅니다.",
    available: true,
  },
  {
    value: "siblings",
    title: "형제·자매",
    description: "비교와 경쟁, 역할 차이, 정서적 거리와 오래 쌓인 관계 패턴을 중심으로 살펴볼 예정입니다.",
    available: false,
  },
  {
    value: "other_family",
    title: "기타 가족",
    description: "가족 안에서의 역할과 기대, 거리 조절, 반복되는 소통 패턴을 관계 특성에 맞춰 살펴볼 예정입니다.",
    available: false,
  },
] as const;

export default function FamilyCompatibilityAnalysisClient({
  myProfileLabel,
  profileId,
}: {
  myProfileLabel: string;
  profileId: string;
}) {
  const [selectedRelationship, setSelectedRelationship] = useState<FamilyRelationshipType>("parent_child");

  function selectRelationship(option: FamilyRelationshipOption) {
    if (!option.available) return;
    setSelectedRelationship(option.value);
    window.setTimeout(() => {
      document.querySelector(`[data-family-relationship-content="${option.value}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 30);
  }

  return (
    <div className="family-analysis-shell mt-8">
      <section
        id="family-relationship-selector"
        data-section="family-relationship-selector"
        className="mx-auto max-w-4xl rounded-[30px] border border-[#e4dac9] bg-white p-6 shadow-[0_18px_50px_rgba(87,72,48,0.07)] sm:p-8"
      >
        <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400">가족 관계 선택</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-stone-950">어떤 가족 관계인가요?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
          먼저 관계 유형을 선택해 주세요. 선택한 관계에 맞춰 아래 역할과 입력 항목, 결과 리포트가 달라집니다.
        </p>

        <div className="-mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
          {RELATIONSHIP_OPTIONS.map((option) => {
            const selected = selectedRelationship === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!option.available}
                aria-pressed={selected}
                onClick={() => selectRelationship(option)}
                className={`min-w-[240px] snap-start rounded-[22px] border p-5 text-left transition sm:min-w-0 ${
                  selected
                    ? "border-stone-900 bg-stone-950 text-white shadow-sm"
                    : option.available
                      ? "border-stone-200 bg-white text-stone-900 hover:border-stone-400"
                      : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold">{option.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      selected
                        ? "bg-white/10 text-white"
                        : option.available
                          ? "bg-[#f3eadb] text-stone-700"
                          : "bg-stone-200/80 text-stone-500"
                    }`}
                  >
                    {option.available ? (selected ? "선택됨" : "이용 가능") : "준비 중"}
                  </span>
                </div>
                <span className={`mt-3 block text-xs leading-6 ${selected ? "text-stone-300" : "text-stone-500"}`}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-6 text-stone-500">
          형제·자매와 기타 가족은 부모·자녀와 다른 기준으로 분석해야 하므로 준비가 완료된 뒤 같은 화면에서 선택할 수 있게 열 예정입니다.
        </p>
      </section>

      {selectedRelationship === "parent_child" ? (
        <div data-family-relationship-content="parent_child" className="scroll-mt-6">
          <FamilyParentChildAnalysisClient myProfileLabel={myProfileLabel} profileId={profileId} />
        </div>
      ) : null}

      <style jsx global>{`
        .family-analysis-shell:has([data-section="family-parent-child-report"]) #family-relationship-selector {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
