type ReportReadyCardProps = {
  productId: string;
};

export default function ReportReadyCard({
  productId,
}: ReportReadyCardProps) {
  return (
    <>
    <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
      REPORT DATA READY
    </p>

    <h2 className="mt-3 text-2xl font-bold text-stone-900">
      무료 분석 결과 복원이 완료되었습니다
    </h2>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        현재 상품 ID는 <strong>{productId}</strong>이며,
        복원된 사주 결과를 바탕으로 유료 심층 분석 입력을 구성할 수 있습니다.
      </p>
      </>
  );
}