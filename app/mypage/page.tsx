"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileDto } from "@/app/lib/profiles/types";

function formatProfileBirthDate(birthDate: string): string {
  return birthDate.replace(/-/g, ".");
}

export default function MyPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetch("/api/profiles"), fetch("/api/profiles/active")])
      .then(async ([profilesResponse, activeResponse]) => {
        const profilesBody = await profilesResponse.json() as { profiles?: ProfileDto[] };
        const activeBody = await activeResponse.json() as { profile?: ProfileDto | null };

        if (!profilesResponse.ok || !activeResponse.ok) {
          throw new Error("프로필 정보를 불러오지 못했습니다.");
        }

        setProfiles(profilesBody.profiles ?? []);
        setActiveProfileId(activeBody.profile?.id ?? null);
      })
      .catch(() => setMessage("로그인 상태를 확인한 뒤 다시 시도해 주세요."));
  }, []);

  async function activate(profileId: string) {
    const response = await fetch("/api/profiles/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    if (!response.ok) {
      setMessage("활성 프로필을 변경하지 못했습니다.");
      return;
    }
    setActiveProfileId(profileId);
    setMessage(null);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">MY PROFILE</p>
        <h1 className="mt-3 text-3xl font-bold">사주 분석 대상</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">여기서 선택한 사람을 기준으로 무료 사주와 유료 심층분석이 진행됩니다.</p>
        <div className="mt-8 grid max-h-96 gap-3 overflow-y-auto pr-1">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => void activate(profile.id)}
              className={profile.id === activeProfileId
                ? "border border-stone-900 bg-stone-900 p-5 text-left text-white"
                : "border border-stone-200 bg-white p-5 text-left"}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold">{profile.label}</span>
                {profile.id === activeProfileId ? (
                  <span className="border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold text-white">현재 선택</span>
                ) : null}
              </span>
              <span className={profile.id === activeProfileId
                ? "mt-2 block text-sm text-white/75"
                : "mt-2 block text-sm text-stone-500"}
              >
                {formatProfileBirthDate(profile.birthDate)}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push("/saju")}
          disabled={!activeProfileId}
          className="mt-6 w-full rounded-xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          선택한 프로필로 사주 조회하기
        </button>
        {message ? <p className="mt-4 text-sm text-red-600">{message}</p> : null}
      </div>
    </main>
  );
}
