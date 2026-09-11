import type { SajuPillarPosition, SajuRelationStar } from "@/app/lib/sajuRelationStars";

const positionLabels: Record<SajuPillarPosition, string> = {
  year: "년지",
  month: "월지",
  day: "일지",
  hour: "시지",
};

function formatPairRelation(relation: SajuRelationStar): string {
  return relation.positions
    .map((position, index) => `${positionLabels[position]} ${relation.branches[index] ?? ""}`.trim())
    .join(" ↔ ");
}

export default function SajuRelationStarsSection({ relationStars }: { relationStars: SajuRelationStar[] }) {
  const pairRelations = relationStars.filter((relation) => relation.kind === "pair");
  const dayVoid = relationStars.find((relation) => relation.kind === "void");
  const hasContent = pairRelations.length > 0 || Boolean(dayVoid);

  return (
    <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-stone-500">RELATION STARS</p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">원국 관계 신살</h2>
        </div>
        <p className="text-xs text-stone-500">원진 · 귀문 · 일주공망</p>
      </div>

      {hasContent ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {pairRelations.map((relation, index) => (
            <div
              key={`${relation.name}-${relation.positions.join("-")}-${index}`}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
            >
              <span className="inline-flex rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                {relation.name}
              </span>
              <p className="mt-3 text-sm font-semibold leading-6 text-stone-800">
                {formatPairRelation(relation)}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                원국의 두 지지 관계로 성립하는 신살입니다.
              </p>
            </div>
          ))}

          {dayVoid ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <span className="inline-flex rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                일주공망
              </span>
              <p className="mt-3 text-sm font-semibold leading-6 text-stone-800">
                공망 {dayVoid.basis}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-700">
                원국 해당: {dayVoid.positions.length > 0
                  ? dayVoid.positions
                      .map((position, index) => `${positionLabels[position]} ${dayVoid.branches[index] ?? ""}`.trim())
                      .join(" · ")
                  : "없음"}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                일주가 속한 旬을 기준으로 계산한 두 공망 지지입니다.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-stone-50 px-5 py-4 text-sm leading-6 text-stone-600">
          현재 원국에서는 운보다 V1 기준의 원진살·귀문관살·일주공망 정보를 계산할 수 없습니다.
        </div>
      )}

      <p className="mt-5 text-xs leading-6 text-stone-500">
        신살은 전통 명리의 보조 지표이며, 한 항목만으로 길흉이나 실제 사건을 단정하지 않습니다.
      </p>
    </section>
  );
}
