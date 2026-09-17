type CompatibilityPreviewMode = "romantic" | "parent_child" | "siblings" | "other_family";

type PreviewConfig = Readonly<{
  headline: string;
  directionTitle: string;
  directionDescription: string;
  domains: readonly string[];
}>;

const PREVIEW_CONFIG: Record<CompatibilityPreviewMode, PreviewConfig> = {
  romantic: {
    headline: "연인·배우자 리포트는 이렇게 읽습니다",
    directionTitle: "나 → 상대 / 상대 → 나를 따로 해석",
    directionDescription: "같은 관계라도 서로 다르게 체감할 수 있는 부분을 방향별로 나눠 설명합니다.",
    domains: ["정서적 연결", "대화", "갈등 패턴", "장기 기준", "갈등 뒤 회복"],
  },
  parent_child: {
    headline: "부모·자녀 리포트는 이렇게 읽습니다",
    directionTitle: "부모 → 자녀 / 자녀 → 부모를 따로 해석",
    directionDescription: "보호와 기대가 자녀에게 어떻게 닿는지, 자녀의 반응이 부모에게 어떻게 느껴지는지 방향별로 나눠 설명합니다.",
    domains: ["정서적 연결", "대화", "기대·독립", "보호·경계", "갈등 뒤 회복"],
  },
  siblings: {
    headline: "형제·자매 리포트는 이렇게 읽습니다",
    directionTitle: "나 → 형제·자매 / 형제·자매 → 나를 따로 해석",
    directionDescription: "서로에게 힘이 되는 부분과 부담으로 느껴질 수 있는 부분을 한 방향으로 뭉개지 않고 나눠 설명합니다.",
    domains: ["정서적 연결", "대화", "비교·경쟁", "역할·경계", "갈등 뒤 회복"],
  },
  other_family: {
    headline: "기타 가족 리포트는 이렇게 읽습니다",
    directionTitle: "서로에게 미치는 영향을 양방향으로 해석",
    directionDescription: "가족 역할이 달라도 한쪽 관점만 보지 않고, 서로에게 어떻게 다르게 작용하는지 나눠 설명합니다.",
    domains: ["정서적 거리", "대화", "역할·기대", "연락·도움·관여 경계", "갈등 뒤 회복"],
  },
};

export default function CompatibilityReportValuePreview({
  mode,
  evaluationYear,
  relationshipLabel,
}: {
  mode: CompatibilityPreviewMode;
  evaluationYear: number;
  relationshipLabel?: string | null;
}) {
  const config = PREVIEW_CONFIG[mode];
  const relationshipContext = mode === "other_family" && relationshipLabel
    ? `${relationshipLabel} 관계에 맞는 역할과 거리 기준을 반영합니다.`
    : null;

  return (
    <section
      data-compatibility-report-preview={mode}
      className="mt-7 overflow-hidden rounded-[28px] border border-[#dfe3ef] bg-[#f9faff] shadow-[0_12px_36px_rgba(32,38,72,0.06)]"
    >
      <div className="border-b border-[#e4e7f1] bg-[linear-gradient(135deg,#f1f0ff_0%,#f9faff_72%)] px-5 py-5 sm:px-6">
        <p className="text-[11px] font-bold tracking-[0.16em] text-stone-400">리포트 구성 미리보기</p>
        <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-stone-950">{config.headline}</h3>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-stone-500">
          실제 분석 결과를 미리 보여주는 화면이 아니라, 결제 후 어떤 순서와 깊이로 읽게 되는지 안내하는 구성 예시입니다.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <ol className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">1</span>
              <p className="text-xs font-bold text-stone-500">관계 핵심</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-stone-900">두 사람의 기본 관계부터 정리</p>
            <p className="mt-1 text-xs leading-6 text-stone-500">힘이 되는 지점과 주의할 패턴을 먼저 짚어 전체 리포트의 기준을 잡습니다.</p>
          </li>

          <li className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">2</span>
              <p className="text-xs font-bold text-stone-500">양방향 영향</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-stone-900">{config.directionTitle}</p>
            <p className="mt-1 text-xs leading-6 text-stone-500">{config.directionDescription}</p>
          </li>

          <li className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">3</span>
              <p className="text-xs font-bold text-stone-500">{evaluationYear}년 흐름</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-stone-900">올해 달라지는 흐름과 행동 가이드</p>
            <p className="mt-1 text-xs leading-6 text-stone-500">기본 관계와 올해 흐름을 구분하고, 지금 해볼 행동과 줄이면 좋은 행동까지 연결합니다.</p>
          </li>
        </ol>

        <div className="mt-5 border-t border-stone-200 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-stone-800">관계별로 더 깊게 보는 영역</p>
              {relationshipContext ? <p className="mt-1 text-xs leading-5 text-stone-500">{relationshipContext}</p> : null}
            </div>
            <p className="text-[11px] font-semibold text-stone-400">단순 점수 대신 관계의 맥락을 나눠 설명</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {config.domains.map((domain) => (
              <span key={domain} className="rounded-full border border-[#e6dccb] bg-[#faf6ee] px-3 py-1.5 text-xs font-semibold text-stone-700">
                {domain}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-5 rounded-2xl bg-stone-50 px-4 py-3 text-xs leading-6 text-stone-500">
          실제 문장은 입력한 두 사람의 계산 결과에 따라 달라집니다. 완성된 {evaluationYear}년판 리포트는 결제 후 구매한 분석에서 다시 볼 수 있습니다.
        </p>
      </div>
    </section>
  );
}
