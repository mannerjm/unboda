import Image from "next/image";

export type TeacherPortraitName =
  | "geumun"
  | "cheongon"
  | "munseong"
  | "ongyeol"
  | "dohyeon"
  | "taesan"
  | "yeonhwa";

type Variant = "list" | "detail" | "report" | "closing";

/** Show the approved portrait with its outfit and original background intact.
 * Individual images are used instead of a cropped-face sprite.
 */
export default function TeacherPortrait({
  name,
  label,
  variant,
  borderColor,
  backgroundColor,
}: {
  name: TeacherPortraitName;
  label: string;
  variant: Variant;
  borderColor?: string;
  backgroundColor?: string;
}) {
  const large = variant === "list";
  return (
    <div
      data-teacher-portrait="full"
      className={`relative shrink-0 self-start overflow-hidden rounded-2xl border shadow-[0_6px_16px_rgba(44,28,50,.09)]
        ${large ? "h-[172px] w-[94px] sm:h-[214px] sm:w-[136px]" : "h-[151px] w-[82px] sm:h-[190px] sm:w-[120px]"}`}
      style={{ borderColor: borderColor ?? "#ddcde4", backgroundColor: backgroundColor ?? "#f4eaf7" }}
    >
      <Image
        src={`/teachers/${name}-full-v4.webp`}
        alt={label}
        fill
        priority={large}
        sizes={large ? "(max-width: 640px) 94px, 136px" : "(max-width: 640px) 82px, 120px"}
        className="object-contain"
      />
    </div>
  );
}
