import AiConsultingChatClient from "./AiConsultingChatClient";

export default async function AiConsultingPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; productId?: string; edition?: string }>;
}) {
  const { profileId, productId, edition } = await searchParams;

  if (!profileId || !productId || !edition) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-5">
        <section className="w-full max-w-xl rounded-[1.75rem] border border-[#dce1ef] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[#11162d]">AI 상담 정보를 확인하지 못했습니다</h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">구매한 유료 리포트 화면에서 AI 상담에 진입해 주세요.</p>
        </section>
      </main>
    );
  }

  return <AiConsultingChatClient profileId={profileId} productId={productId} edition={edition} />;
}
