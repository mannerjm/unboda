"use client";

import { useState } from "react";
import PaidFamilyExtendedAnalysisClient from "@/app/components/PaidFamilyExtendedAnalysisClient";
import PaidFamilyParentChildAnalysisClient from "@/app/components/PaidFamilyParentChildAnalysisClient";

type FamilyRelationshipType = "parent_child" | "siblings" | "other_family";

type FamilyRelationshipOption = {
  value: FamilyRelationshipType;
  title: string;
  description: string;
};

const RELATIONSHIP_OPTIONS: readonly FamilyRelationshipOption[] = [
  {
    value: "parent_child",
    title: "부모·자녀",
    description: "보호와 독립, 기대와 경계, 대화와 회복을 부모와 자녀의 방향을 나누어 살펴봅니다.",
  },
  {
    value: "siblings",
    title: "형제·자매",
    description: "정서적 연결과 대화, 비교와 경쟁, 오래 굳어진 역할과 경계, 갈등 뒤 회복을 살펴봅니다.",
  },
  {
    value: "other_family",
    title: "기타 가족",
    description: "조부모·손주, 조카, 사촌, 인척 등 관계 유형에 맞춰 역할과 기대, 거리와 소통을 살펴봅니다.",
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
        className="mx-auto max-w-4xl rounded-[30px] border border-[#dfe3ef] bg-white p-6 shadow-[0_18px_50px_rgba(32,38,72,0.07)] sm:p-8"
      >
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#6f5ce7]">가족 관계 선택</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">어떤 가족 관계인가요?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          먼저 관계 유형을 선택해 주세요. 관계별로 보는 기준과 입력 항목, 결과 리포트가 따로 구성됩니다.
        </p>

        <div className="-mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
          {RELATIONSHIP_OPTIONS.map((option) => {
            const selected = selectedRelationship === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => selectRelationship(option)}
                className={`min-w-[240px] snap-start rounded-[22px] border p-5 text-left transition sm:min-w-0 ${selected ? "border-stone-900 bg-[#171a3d] text-white shadow-sm" : "border-[#dce1ef] bg-white text-[#11162d] hover:border-[#aaa0f4]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold">{option.title}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${selected ? "bg-white/10 text-white" : "bg-[#f3f1ff] text-[#5e4bd1]"}`}>
                    {selected ? "선택됨" : "이용 가능"}
                  </span>
                </div>
                <span className={`mt-3 block text-xs leading-6 ${selected ? "text-slate-300" : "text-slate-500"}`}>{option.description}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-500">가족 관계마다 별도의 해석 기준과 연도판 리포트를 사용하며, 구매한 리포트는 구매 당시 연도판으로 저장됩니다.</p>
      </section>

      {selectedRelationship === "parent_child" ? (
        <div data-family-relationship-content="parent_child" className="scroll-mt-6">
          <PaidFamilyParentChildAnalysisClient myProfileLabel={myProfileLabel} profileId={profileId} />
        </div>
      ) : null}
      {selectedRelationship === "siblings" ? (
        <div data-family-relationship-content="siblings" className="scroll-mt-6">
          <PaidFamilyExtendedAnalysisClient mode="siblings" myProfileLabel={myProfileLabel} profileId={profileId} />
        </div>
      ) : null}
      {selectedRelationship === "other_family" ? (
        <div data-family-relationship-content="other_family" className="scroll-mt-6">
          <PaidFamilyExtendedAnalysisClient mode="other_family" myProfileLabel={myProfileLabel} profileId={profileId} />
        </div>
      ) : null}
    </div>
  );
}
