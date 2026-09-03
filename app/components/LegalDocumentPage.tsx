import Link from "next/link";
import type { ReactNode } from "react";

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
};

export default function LegalDocumentPage({ eyebrow, title, summary, children }: LegalDocumentPageProps) {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-stone-900 sm:px-8 sm:py-16">
      <article className="mx-auto w-full max-w-3xl">
        <Link href="/" className="inline-flex text-sm font-semibold text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2">
          운보다 홈
        </Link>
        <header className="mt-12 border-b border-stone-300 pb-8">
          <p className="text-xs font-semibold tracking-[0.24em] text-stone-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-stone-950 sm:text-4xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-600">{summary}</p>
        </header>
        <div className="legal-document mt-8 space-y-8 text-[15px] leading-[1.75] text-stone-700 sm:mt-10 sm:space-y-10 sm:text-base sm:leading-8 [&_h2]:border-l-2 [&_h2]:border-stone-900 [&_h2]:pl-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:leading-7 [&_h2]:text-stone-950 sm:[&_h2]:pl-4 sm:[&_h2]:text-xl sm:[&_h2]:leading-8 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-stone-950 [&_li]:pl-0 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 sm:[&_ol]:space-y-2 sm:[&_ol]:pl-6 [&_p]:max-w-2xl [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 sm:[&_ul]:space-y-2 sm:[&_ul]:pl-6">
          {children}
        </div>
        <nav aria-label="정책 문서" className="mt-12 border-t border-stone-300 pt-6 text-sm text-stone-600 sm:mt-16">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link className="underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2" href="/terms">이용약관</Link></li>
            <li><Link className="underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2" href="/privacy">개인정보처리방침</Link></li>
            <li><Link className="underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2" href="/refund">환불·취소·청약철회 정책</Link></li>
          </ul>
        </nav>
      </article>
    </main>
  );
}
