import type { CSSProperties } from "react";
import { getTopicTeacher } from "@/app/lib/topicTeachers";
import TeacherPortrait, { type TeacherPortraitName } from "@/app/components/TeacherPortrait";

type CardVariant = "list" | "detail" | "report" | "closing";
const portraitByCategory = {
  health: "cheongon",
  growth: "munseong",
  social: "ongyeol",
  career: "dohyeon",
  business: "taesan",
  relationship: "yeonhwa",
} as const satisfies Record<string, TeacherPortraitName>;

export default function TopicTeacherCard({
  category,
  variant,
  conclusion,
  immediateAction,
}: {
  category: string;
  variant: CardVariant;
  conclusion?: string;
  immediateAction?: string;
}) {
  const teacher = getTopicTeacher(category);
  if (!teacher) return null;

  const isList = variant === "list";
  const isClosing = variant === "closing";
  const palette = {
    "--teacher-accent": teacher.accent,
    "--teacher-pale": teacher.pale,
    "--teacher-border": teacher.border,
  } as CSSProperties;

  return (
    <section
      data-topic-teacher={category}
      data-topic-teacher-variant={variant}
      aria-label={`${teacher.categoryLabel} 풀이 담당 ${teacher.name} 선생님`}
      style={{ ...palette, backgroundImage: `linear-gradient(120deg,#fffafd 0%,${teacher.pale} 100%)`, borderColor: teacher.border }}
      className={`overflow-hidden rounded-[1.35rem] border text-[#30203e] shadow-[0_10px_26px_rgba(78,49,115,.06)] ${isList ? "mb-5" : "my-4"}`}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
        <TeacherPortrait
          name={portraitByCategory[teacher.category]}
          label={`${teacher.name} 선생님, 한복과 배경이 함께 보이는 인물 사진`}
          variant={variant}
          borderColor={teacher.border}
          backgroundColor={teacher.pale}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold" style={{ color: teacher.accent }}>운보다 · {teacher.categoryLabel} 풀이 담당</p>
          <h2 className={`mt-1 break-keep font-black tracking-tight ${isList ? "text-lg sm:text-2xl" : "text-base sm:text-xl"}`} style={{ color: teacher.dark }}>
            {isList ? teacher.title : isClosing ? `${teacher.name} 선생님의 마무리` : `${teacher.name} 선생님`}
          </h2>
          <p className="mt-2 break-keep text-[13px] font-medium leading-6 text-[#54445b] sm:text-[15px]">
            {isClosing ? "이번 레포트의 결론과 실천할 내용을 다시 살펴보세요." : variant === "report" ? `구매하신 ${teacher.categoryLabel} 레포트의 중요한 내용을 함께 살펴봅니다.` : teacher.intro}
          </p>
          {!isClosing ? <p className="mt-3 hidden text-xs leading-5 text-[#6d5d72] sm:block">사주 풀이를 바탕으로, 일상에서 도움이 되는 점검 기준을 안내합니다.</p> : null}
          {!isClosing ? (
                  <div data-topic-teacher-profile="visible" className="mt-4 space-y-3 border-t pt-3" style={{ borderColor: teacher.border }}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <strong className="shrink-0 text-[13px] font-bold" style={{ color: teacher.accent }}>살펴보는 분야</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.fields.map((field) => (
                          <span key={field} className="rounded-full border bg-white px-2.5 py-1 text-[13px] font-semibold leading-5 text-[#413749]" style={{ borderColor: teacher.border }}>
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <strong className="shrink-0 text-[13px] font-bold" style={{ color: teacher.accent }}>풀이 방식</strong>
                      <p className="min-w-0 flex-1 basis-[220px] break-keep text-[13px] leading-6 text-[#493c50] sm:text-sm">{teacher.approach}</p>
                    </div>
                    {teacher.note ? <p className="text-xs leading-5 text-[#615a65]">{teacher.note}</p> : null}
                  </div>
                ) : null}
        </div>
      </div>

      {isClosing && (conclusion || immediateAction) ? (
        <div className="mx-4 mb-4 space-y-3 rounded-xl border bg-white/90 px-4 py-4 text-sm leading-7 text-[#463752] sm:mx-6 sm:px-5" style={{ borderColor: teacher.border }}>
          {conclusion ? <p><strong className="mr-2" style={{ color: teacher.accent }}>이번 분석의 결론</strong>{conclusion}</p> : null}
          {immediateAction ? <p><strong className="mr-2" style={{ color: teacher.accent }}>실천할 한 가지</strong>{immediateAction}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
