import AiConsultingChatClient from "./AiConsultingChatClient";

export default async function AiConsultingPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; productId?: string; edition?: string }>;
}) {
  const { profileId, productId, edition } = await searchParams;

  if (!profileId || !productId || !edition) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-stone-950">AI 상담 정보를 확인하지 못했습니다</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">구매한 심층 분석 화면에서 AI 상담에 진입해 주세요.</p>
        </section>
      </main>
    );
  }

  return <AiConsultingChatClient profileId={profileId} productId={productId} edition={edition} />;
}
