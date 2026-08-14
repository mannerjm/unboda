"use client";

import { useState } from "react";
import ProfileSelector from "@/app/components/ProfileSelector";
import type { ProfileDto } from "@/app/lib/profiles/types";

type ProfileTargetControlProps = {
  productId: string;
  destination: "checkout" | "paid-analysis";
  label: string;
  profile: ProfileDto;
  targetLabel: string;
};

export default function ProfileTargetControl({
  productId,
  destination,
  label,
  profile,
  targetLabel,
}: ProfileTargetControlProps) {
  const [isChanging, setIsChanging] = useState(false);

  return (
    <section className="mt-6 border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-stone-900">{profile.label}</p>
          <p className="mt-1 text-xs text-stone-500">{targetLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsChanging((value) => !value)}
          className="border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900"
        >
          대상 변경
        </button>
      </div>
      {isChanging ? (
        <ProfileSelector
          productId={productId}
          currentProfileId={profile.id}
          destination={destination}
        />
      ) : null}
    </section>
  );
}
