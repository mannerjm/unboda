import type { SajuPillarPosition, SajuRelationStar } from "@/app/lib/sajuRelationStars";

const positionLabels: Record<SajuPillarPosition, string> = {
  year: "년지",
  month: "월지",
  day: "일지",
  hour: "시지",
};

function formatRelation(relation: SajuRelationStar): string {
  if (relation.kind === "void") {
    const matched = relation.positions
      .map((position, index) => `${positionLabels[position]} ${relation.branches[index] ?? ""}`.trim())
      .join(" · ");
    return `${matched} · 일주 기준 공망 ${relation.basis}`;
  }

  return relation.positions
    .map((position, index) => `${positionLabels[position]} ${relation.branches[index] ?? ""}`.trim())
    .join(" ↔ ");
}

export default function SajuRelationStarsSection({ relationStars }: { relationStars: SajuRelationStar[] }) {
  return (
    <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-stone-500">RELATION STARS</p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">원국 관계 신살</h2>
        </div>
        <p className="text-xs text-stone-500">원진 · 귀문 · 공망</p>
      </div>

      {relationStars.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relationStars.map((relation, index) => (
            <div
              key={`${relation.name}-${relation.positions.join("-")}-${index}`}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
            >
              <span className="inline-flex rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                {relation.name}
              </span>
              <p className="mt-3 text-sm font-semibold leading-6 text-stone-800">
                {formatRelation(relation)}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {relation.kind === "void" ? "일주가 속한 旬의 공망 지지가 원국에 있는 경우입니다." : "원국의 두 지지 관계로 성립하는 신살입니다."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-stone-50 px-5 py-4 text-sm leading-6 text-stone-600">
          현재 원국에서는 운보다 V1 기준의 원진살·귀문관살·공망 관계가 확인되지 않습니다.
        </div>
      )}

      <p className="mt-5 text-xs leading-6 text-stone-500">
        신살은 전통 명리의 보조 지표이며, 한 항목만으로 길흉이나 실제 사건을 단정하지 않습니다.
      </p>
    </section>
  );
}
