import type { getSaju } from "./manse";

type SajuResult = ReturnType<typeof getSaju>;

export type RestoreStoredResult =
  | {
      ok: true;
      result: string;
      saju: SajuResult;
    }
  | {
      ok: false;
      message: string;
    };

export function restoreStoredResult(
  savedResult: string | null,
  savedSaju: string | null
): RestoreStoredResult {
  if (!savedResult || !savedSaju) {
    return {
      ok: false,
      message: "AI 분석 결과를 찾을 수 없습니다.",
    };
  }

  try {
    const parsedSaju = JSON.parse(savedSaju);

    if (!parsedSaju || typeof parsedSaju !== "object") {
      return {
        ok: false,
        message: "저장된 분석 데이터를 불러올 수 없습니다.",
      };
    }

    return {
      ok: true,
      result: savedResult,
      saju: parsedSaju as SajuResult,
    };
  } catch {
    return {
      ok: false,
      message: "저장된 분석 데이터를 불러올 수 없습니다.",
    };
  }
}