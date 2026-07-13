"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

const titleIcons: Record<string, string> = {
  "한눈에 보는 핵심": "✨",
  "성격과 강점": "💪",
  "보완하면 좋은 점": "⚠️",
  "직업과 일": "💼",
  재물운: "💰",
  인간관계: "❤️",
  "올해 실천하면 좋은 것": "🎯",
  "운보다 한마디": "💬",
};

function formatUnbodaMessage(text: string) {
  const headingPattern = /^#{1,6}\s*운보다 한마디\s*$/m;
  const match = headingPattern.exec(text);

  if (!match) {
    return text;
  }

  const headingEnd = match.index + match[0].length;
  const beforeMessage = text.slice(0, headingEnd);
  const message = text.slice(headingEnd).trim();

  if (!message) {
    return text;
  }

  const quotedMessage = message
    .split("\n")
    .map((line) => (line.trim() ? `> ${line.trim()}` : ">"))
    .join("\n");

  return `${beforeMessage}\n\n${quotedMessage}`;
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aiResult, setAiResult] = useState("");

  const birthDate = searchParams.get("birthDate") || "입력 없음";
  const birthTime = searchParams.get("birthTime") || "입력 없음";
  const gender = searchParams.get("gender") || "입력 없음";

  useEffect(() => {
    const savedResult = sessionStorage.getItem("sajuResult");

    if (savedResult) {
      setAiResult(savedResult);
    } else {
      setAiResult("AI 분석 결과를 찾을 수 없습니다.");
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <p className="mb-4 text-xs tracking-[0.35em] text-stone-500">
            UNBODA AI REPORT
          </p>

          <h1 className="text-4xl font-bold sm:text-5xl">
            당신의 사주 리포트
          </h1>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            입력하신 출생 정보를 바탕으로 만든
            <br className="sm:hidden" />
            운보다 AI 참고용 분석입니다.
          </p>
        </header>

        <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="mb-5 text-sm font-semibold tracking-wider text-stone-500">
            입력 정보
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard label="생년월일" value={birthDate} />
            <InfoCard label="태어난 시간" value={birthTime} />
            <InfoCard label="성별" value={gender} />
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-lg text-white">
              運
            </div>

            <div>
              <p className="text-xs tracking-[0.25em] text-stone-500">
                AI ANALYSIS
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                운보다 AI 분석
              </h2>
            </div>
          </div>

          <div className="text-[16px] leading-9 text-stone-700">
  {aiResult ? (
    <ReactMarkdown
      components={{
        h1: ({ children }) => {
  const title = String(children);
  const icon = titleIcons[title] || "✦";

  return (
    <section className="mb-6 mt-12 border-t border-stone-200 pt-8 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl"
        >
          {icon}
        </span>
        <span>{children}</span>
      </h2>
    </section>
  );
},

h2: ({ children }) => {
  const title = String(children);
  const icon = titleIcons[title] || "✦";

  return (
    <section className="mb-6 mt-12 border-t border-stone-200 pt-8">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl"
        >
          {icon}
        </span>
        <span>{children}</span>
      </h2>
    </section>
  );
},

h3: ({ children }) => {
  const title = String(children);
  const icon = titleIcons[title] || "✦";

  return (
    <h3 className="mb-5 mt-10 flex items-center gap-3 text-xl font-bold text-stone-900">
      <span aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </h3>
  );
},
        p: ({ children }) => (
          <p className="mb-6 leading-9">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-6 space-y-3 pl-6">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="list-disc">{children}</li>
        ),
        blockquote: ({ children }) => (
  <blockquote className="my-8 rounded-3xl border border-stone-200 bg-stone-50 px-7 py-6 text-lg font-medium leading-8 text-stone-800 shadow-sm">
    {children}
  </blockquote>
),
        strong: ({ children }) => (
          <strong className="font-bold text-stone-900">{children}</strong>
        ),
      }}
    >
      {formatUnbodaMessage(aiResult)}
    </ReactMarkdown>
  ) : (
    "분석 결과를 불러오는 중입니다..."
  )}
</div>
        </section>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/saju")}
            className="rounded-2xl border border-stone-300 bg-white px-5 py-4 font-semibold transition hover:bg-stone-50"
          >
            다시 분석하기
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
          >
            리포트 인쇄하기
          </button>
        </div>

        <p className="mt-8 text-center text-xs leading-6 text-stone-500">
          본 리포트는 참고용 콘텐츠이며 중요한 건강·법률·투자 결정은
          관련 전문가와 상담해 주세요.
        </p>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-5 py-4">
      <p className="mb-2 text-xs text-stone-500">{label}</p>
      <p className="font-semibold text-stone-900">{value}</p>
    </div>
  );
}