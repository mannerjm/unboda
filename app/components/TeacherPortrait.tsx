import Image from "next/image";

export type TeacherPortraitName =
  | "geumun"
  | "cheongon"
  | "munseong"
  | "ongyeol"
  | "dohyeon"
  | "taesan"
  | "yeonhwa"
  | "taeun";

type Variant = "list" | "detail" | "report" | "closing";

/**
 * A single shared portrait for the catalog, detail and report screens.
 * The image determines the portrait's height: no fixed-height container
 * or background-size can create unwanted side gaps or crop the outfit.
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
      data-portrait-fit="natural"
      className={`shrink-0 self-start overflow-hidden rounded-2xl border shadow-[0_6px_16px_rgba(44,28,50,.09)] ${large ? "w-[88px] sm:w-[112px]" : "w-[80px] sm:w-[100px]"}`}
      style={{ borderColor: borderColor ?? "#ddcde4", backgroundColor: backgroundColor ?? "#f4eaf7" }}
    >
      <Image
        src={`/teachers/${name}-full-v4.webp`}
        alt={label}
        width={256}
        height={512}
        priority={large}
        sizes={large ? "(max-width: 640px) 88px, 112px" : "(max-width: 640px) 80px, 100px"}
        className="block h-auto w-full"
      />
    </div>
  );
}
