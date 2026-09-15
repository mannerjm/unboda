import { NextResponse } from "next/server";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { buildCompatibilityTiming } from "@/app/lib/compatibilityTiming";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "@/app/lib/compatibilityCustomerInput";
import { generateCompatibilityReport } from "@/app/lib/compatibilityReportService";

function koreaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return NextResponse.json({ error: "분석할 내 프로필을 먼저 선택해 주세요." }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as { partner?: unknown } | null;
  const validation = validateCompatibilityPartnerInput(body?.partner);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const evaluationDate = koreaDate();
  const evaluationYear = Number(evaluationDate.slice(0, 4));

  let timingResult;
  try {
    const mine = buildProfileCompatibilitySnapshot(activeProfile, evaluationDate);
    const partner = buildPartnerCompatibilitySnapshot(validation.value, evaluationDate);
    timingResult = buildCompatibilityTiming(
      mine.person,
      partner.person,
      {
        evaluationYear,
        A: mine.timing,
        B: partner.timing,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "궁합 계산 입력을 확인하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const generated = await generateCompatibilityReport(timingResult);
    return NextResponse.json({
      report: generated.report,
      meta: {
        evaluationYear,
        myProfileLabel: activeProfile.label,
        partnerLabel: validation.value.label,
        partnerBirthTimeKnown: validation.value.birthTimeKnown,
        natalDataQuality: generated.context.natalDataQuality,
        timingDataQuality: generated.context.timingDataQuality,
      },
    });
  } catch (error) {
    console.error("[compatibility-report] generation failed", {
      userIdPresent: Boolean(user.id),
      evaluationYear,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "궁합 리포트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
