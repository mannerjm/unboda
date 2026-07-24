import type { AnalyzePremiumResponse } from "@/app/lib/analyzeApiTypes";

type ElementRelationsCardProps = {
  elementRelations: AnalyzePremiumResponse["elementRelations"];
};

export default function ElementRelationsCard({
  elementRelations,
}: ElementRelationsCardProps) {
  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
        ELEMENT RELATIONS
      </p>

      <h2 className="mt-3 text-2xl font-bold text-stone-900">
        오행 관계 분석
      </h2>

      <p className="mt-4 text-sm leading-7 text-stone-700">
        {elementRelations.summary}
      </p>

      <div className="mt-6 space-y-3">
        {elementRelations.relations.map((relation, index) => (
          <div
            key={`${relation.source}-${relation.target}-${index}`}
            className="rounded-xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-base text-stone-900">
                {relation.source} → {relation.target}
              </strong>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                {relation.type}
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                강도 {relation.strength}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-700">
              {relation.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}