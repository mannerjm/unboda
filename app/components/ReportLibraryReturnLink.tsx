import Link from "next/link";

/**
 * Shared navigation for completed paid reports. Use only after purchase access
 * has been verified; always return to the library rather than account settings.
 * The footer follows AI consultation, reviews, and recommendations.
 */
export default function ReportLibraryReturnLink({ placement }: { placement: "top" | "bottom" }) {
  if (placement === "top") {
    return (
      <nav aria-label="리포트 나가기" className="flex items-center">
        <Link
          href="/purchased-analyses"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4 transition hover:bg-white hover:text-[#5143b0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7]"
        >
          <span aria-hidden="true">←</span>
          구매 보관함으로 돌아가기
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label="리포트 완료 후 이동" className="mx-auto mb-12 mt-7 max-w-4xl px-4 sm:px-8">
      <Link
        href="/purchased-analyses"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#cfd5e6] bg-white px-5 py-3 text-sm font-bold text-[#252348] shadow-sm transition hover:border-[#a89cf2] hover:bg-[#f6f4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7]"
      >
        <span aria-hidden="true">←</span>
        구매 보관함으로 돌아가기
      </Link>
    </nav>
  );
}
