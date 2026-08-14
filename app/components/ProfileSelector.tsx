"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_PROFILES_PER_USER, type ProfileDto } from "@/app/lib/profiles/types";

type ProfileSelectorProps = {
  productId: string;
  currentProfileId?: string;
  destination: "checkout" | "paid-analysis";
};

export default function ProfileSelector({
  productId,
  currentProfileId,
  destination,
}: ProfileSelectorProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadProfiles() {
      try {
        const response = await fetch("/api/profiles");
        const body = (await response.json()) as { profiles?: ProfileDto[] };

        if (response.ok && !isCancelled) {
          setProfiles(body.profiles ?? []);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadProfiles();
    return () => { isCancelled = true; };
  }, []);

  const selectedExists = Boolean(
    currentProfileId && profiles.some((profile) => profile.id === currentProfileId),
  );

  return (
    <section className="mt-6 border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        ANALYSIS PROFILE
      </p>
      <h2 className="mt-2 text-lg font-bold text-stone-900">
        분석할 대상을 선택하세요
      </h2>
      <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => router.push(`/${destination}/${productId}?profileId=${profile.id}`)}
            className={profile.id === currentProfileId
              ? "border border-stone-900 bg-stone-900 px-4 py-3 text-left text-white"
              : "border border-stone-200 bg-stone-50 px-4 py-3 text-left text-stone-900"}
          >
            <span className="block font-semibold">{profile.label}</span>
            <span className="mt-1 block text-xs opacity-75">{profile.relationshipType}</span>
          </button>
        ))}
      </div>
      {!isLoading && profiles.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">등록된 Profile이 없습니다.</p>
      ) : null}
      {!isLoading && profiles.length >= MAX_PROFILES_PER_USER ? (
        <p className="mt-4 text-xs text-stone-500">계정당 최대 {MAX_PROFILES_PER_USER}개의 Profile을 사용할 수 있습니다.</p>
      ) : null}
      {!isLoading && profiles.length > 0 && !selectedExists ? (
        <p className="mt-4 text-sm text-stone-600">계속하려면 분석 대상을 선택해 주세요.</p>
      ) : null}
    </section>
  );
}
