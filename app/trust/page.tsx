import Link from "next/link";
import LegalDocumentPage from "@/app/components/LegalDocumentPage";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: "운보다 이용 원칙",
  description: "구매 리포트, AI 상담, 기억, 프로필, 질문권과 구매 인증 후기가 어떻게 운영되는지 운보다의 이용 원칙을 확인하세요.",
  path: "/trust",
});

export default function TrustPage() {
  const principles = [
    {
      title: "구매한 분석을 기준으로 AI 상담",
      body: "AI 상담은 계정이 실제로 보유한 완료 리포트를 확인한 뒤 그 범위 안에서 답변합니다. 구매하지 않은 다른 유료 분석의 독자적인 결론을 임의로 대신하지 않습니다.",
    },
    {
      title: "내가 허용한 내용만 장기 기억",
      body: "상담 전체를 자동으로 장기 저장하지 않습니다. 내가 직접 ‘기억하기’를 선택한 상황과 목표만 다음 상담에 참고하며, 저장한 내용은 수정하거나 삭제할 수 있습니다.",
    },
    {
      title: "프로필과 구매 당시 기준을 섞지 않음",
      body: "프로필별 분석과 상담을 분리하고, 출생정보가 바뀐 뒤의 새 분석과 이전 구매 리포트를 같은 근거처럼 섞지 않습니다.",
    },
    {
      title: "완료된 구매 리포트는 다시 열람",
      body: "구매한 상품·프로필·에디션 연결을 보존하고, 완료된 리포트는 구매한 분석에서 다시 확인할 수 있습니다.",
    },
    {
      title: "정상 답변 완료 기준으로 질문권 차감",
      body: "AI 상담에서 범위를 벗어난 질문, 안전상 답변할 수 없는 질문, 답변 생성 실패에는 질문권을 차감하지 않습니다.",
    },
    {
      title: "구매 인증 후기만 표시",
      body: "후기는 완료된 유료 리포트의 실제 구매 기록이 서버에서 확인된 계정만 작성할 수 있습니다. 운영자는 개인정보·스팸·욕설 등 공개 적합성만 검수하고, 부정적인 평가라는 이유만으로 숨기지 않습니다.",
    },
  ];

  return (
    <LegalDocumentPage
      eyebrow="TRUST & TRANSPARENCY"
      title="운보다가 지키는 이용 원칙"
      summary="과장된 적중률이나 검증되지 않은 숫자보다, 실제 서비스가 어떻게 동작하는지 투명하게 안내합니다. 아래 원칙은 현재 운보다의 결제·리포트·AI 상담·기억 시스템이 실제로 지키는 기준입니다."
    >
      {principles.map((item) => (
        <section key={item.title}>
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </section>
      ))}
      <section>
        <h2>정책과 지원</h2>
        <p>구체적인 법적 기준과 개인정보 처리, 환불·취소 기준은 아래 공식 문서를 따릅니다.</p>
        <ul>
          <li><Link href="/privacy">개인정보처리방침</Link></li>
          <li><Link href="/terms">이용약관</Link></li>
          <li><Link href="/refund">환불·취소 정책</Link></li>
          <li><Link href="/support">고객지원</Link></li>
        </ul>
      </section>
    </LegalDocumentPage>
  );
}
