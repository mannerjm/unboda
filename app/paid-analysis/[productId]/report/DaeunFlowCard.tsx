import type { AnalyzePremiumResponse } from "@/app/lib/analyzeApiTypes";

type DaeunFlowCardProps = {
  daeunAnalysis: AnalyzePremiumResponse["daeunAnalysis"];
};

export default function DaeunFlowCard({
  daeunAnalysis,
}: DaeunFlowCardProps) {
  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
  <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
    DAEUN FLOW
  </p>

  <h2 className="mt-3 text-2xl font-bold text-stone-900">
    10년 대운 흐름
  </h2>

  <div className="mt-5 grid gap-3 sm:grid-cols-2">
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-semibold text-stone-500">
        대운 방향
      </p>

      <p className="mt-2 text-base font-bold text-stone-900">
        {daeunAnalysis.direction}
      </p>
    </div>

    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-semibold text-stone-500">
        대운 시작 나이
      </p>

      <p className="mt-2 text-base font-bold text-stone-900">
        {daeunAnalysis.startAge}세
      </p>
    </div>
  </div>

  <div className="mt-6 space-y-3">
    {daeunAnalysis.daeuns.map(
      (daeun) => {
        const startAge =
  daeunAnalysis.startAge +
  (daeun.order - 1) * 10;

        return (
          <div
            key={`${daeun.order}-${daeun.ganji}`}
            className="rounded-xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-500">
                  {daeun.order}번째 대운
                </p>

                <p className="mt-1 text-lg font-bold text-stone-900">
                  {daeun.ganji}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <div>
        <p className="text-xs text-stone-500">천간</p>
        <p className="font-semibold">
            {daeun.analysis.stem}
        </p>
    </div>

    <div>
        <p className="text-xs text-stone-500">지지</p>
        <p className="font-semibold">
            {daeun.analysis.branch}
        </p>
    </div>

    <div>
        <p className="text-xs text-stone-500">천간 오행</p>
        <p>
            {daeun.analysis.stemElement}
        </p>
    </div>

    <div>
        <p className="text-xs text-stone-500">지지 오행</p>
        <p>
            {daeun.analysis.branchElement}
        </p>
    </div>
</div>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                {startAge}세 시작
              </span>
            </div>
          </div>
        );
      }
    )}
  </div>
</div>
  );
}