export type FreeAnalysisAIInterpretation = {
  overview?: string;
  strength?: string;
  fiveElements?: string;
  yongshin?: string;
  gyeokguk?: string;
  daeun?: string;
  seun?: string;
  wealth?: string;
  relationship?: string;
  health?: string;
  summary?: string;
};

type SectionKey = keyof FreeAnalysisAIInterpretation;

const headingMap: Record<string, SectionKey> = {
  "한눈에 보는 핵심": "overview",
  "오행 분석": "fiveElements",
  "원국 결과와 신강·신약의 맥락": "strength",
  "신강·신약": "strength",
  "용신 해석": "yongshin",
  "격국 해석": "gyeokguk",
  "현재 대운 해석": "daeun",
  "현재 세운 해석": "seun",
  "재물 흐름": "wealth",
  "재물운": "wealth",
  "인간관계": "relationship",
  "관계 흐름": "relationship",
  "건강과 생활 리듬": "health",
  "건강·생활 리듬": "health",
  "종합/마무리": "summary",
  "종합 해석": "summary",
  "운보다 한마디": "summary",
};

const internalTokenPattern = /\b[a-z][a-z0-9_-]*:[A-Za-z][A-Za-z0-9]*\b|\b[a-z][a-z0-9_-]*-[a-z0-9-]+\b/g;

function sanitize(text: string): string {
  return text.replace(internalTokenPattern, "현재 분석 흐름").trim();
}

function normalizeHeading(value: string): string {
  const normalized = value
    .replace(/^\s*(?:#{1,6}\s*|[-*+]\s+)/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^__|__$/g, "")
    .replace(/^(?:\d+|[①②③④⑤⑥⑦⑧⑨⑩⑪])\s*[.)、:：-]\s*/, "")
    .replace(/^(?:\*\*|__)/, "")
    .replace(/(?:\*\*|__)$/, "")
    .replace(/\s*[:：]\s*$/, "")
    .trim();

  return normalized;
}

function getSectionKey(line: string): SectionKey | "combinedFlow" | undefined {
  const heading = normalizeHeading(line);

  if (heading === "현재 대운과 세운 해석") {
    return "combinedFlow";
  }

  return headingMap[heading];
}

export function parseFreeAnalysisAIInterpretation(
  markdown: string | undefined,
): FreeAnalysisAIInterpretation {
  if (!markdown?.trim()) {
    return {};
  }

  const sections: FreeAnalysisAIInterpretation = {};
  const lines = markdown.split(/\r?\n/);
  let currentKey: SectionKey | "combinedFlow" | undefined;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentKey) return;

    const content = sanitize(buffer.join("\n"));
    if (!content) return;

    if (currentKey === "combinedFlow") {
      sections.daeun = content;
      sections.seun = content;
    } else {
      sections[currentKey] = content;
    }
  };

  for (const line of lines) {
    const nextKey = getSectionKey(line);

    if (nextKey) {
      flush();
      currentKey = nextKey;
      buffer = [];
      continue;
    }

    if (currentKey) {
      buffer.push(line);
    }
  }

  flush();

  if (Object.keys(sections).length === 0) {
    sections.summary = sanitize(markdown);
  }

  return sections;
}
