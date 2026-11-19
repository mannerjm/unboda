import Image from "next/image";

type CompatibilityHeroMode = "romantic" | "workplace" | "friend" | "business" | "family";

const HERO_VISUALS: Record<CompatibilityHeroMode, { src: string; alt: string; question: string }> = {
  romantic: {
    src: "/images/premium/relationship-marriage.jpg",
    alt: "함께 미래를 이야기하는 연인",
    question: "두 사람은 어떤 부분에서 잘 맞을까요?",
  },
  workplace: {
    src: "/images/premium/career-workplace-relationships.jpg",
    alt: "일에 관해 의견을 나누는 직장 동료",
    question: "함께 일할 때 어떤 부분이 다를까요?",
  },
  friend: {
    src: "/images/premium/relationship-friendship.jpg",
    alt: "대화하며 시간을 보내는 친구들",
    question: "서로의 마음을 더 잘 이해할 수 있을까요?",
  },
  business: {
    src: "/images/premium/business-team-management.jpg",
    alt: "사업 관련 일을 함께 논의하는 사람들",
    question: "함께하는 사업에서 무엇을 맞춰야 할까요?",
  },
  family: {
    src: "/images/premium/relationship-family-role.jpg",
    alt: "함께 시간을 보내는 가족",
    question: "가족 안에서 서로를 어떻게 이해할까요?",
  },
};

export default function CompatibilityDetailHero({
  mode,
  title,
  description,
}: {
  mode: CompatibilityHeroMode;
  title: string;
  description: string;
}) {
  const visual = HERO_VISUALS[mode];

  return (
    <header className="mt-7 overflow-hidden rounded-[2rem] border border-[#e6d6f7] bg-[linear-gradient(140deg,#fff9fd_0%,#f2eaff_62%,#e9e8ff_100%)] p-5 shadow-[0_18px_45px_rgba(92,64,137,0.10)] sm:p-8">
      <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <p className="text-sm font-extrabold text-[#7354ba]">내 사주와 상대방 사주를 함께 살펴봐요</p>
          <p className="mt-4 text-base font-extrabold text-[#684f9c]">{title}</p>
          <h1 className="mt-2 break-keep text-[29px] font-black leading-[1.35] tracking-[-0.04em] text-[#27163f] sm:text-[35px]">
            {visual.question}
          </h1>
          <p className="mt-4 break-keep text-[16px] leading-8 text-[#5b4e71]">{description}</p>
          <p className="mt-3 text-sm text-[#796b89]">실제 두 사람의 결과는 정보를 입력하고 분석이 완료된 뒤 확인할 수 있습니다.</p>
        </div>
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[360px] overflow-hidden rounded-[1.7rem] border-[5px] border-white bg-[#e6ddf7] shadow-[0_12px_32px_rgba(74,43,117,0.13)]">
          <Image src={visual.src} alt={visual.alt} fill sizes="(max-width: 640px) 86vw, 360px" className="object-cover" />
        </div>
      </div>
    </header>
  );
}
