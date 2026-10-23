/** The official Modern Mystic symbol shared by Home and the app navigation. */
export default function BrandMark() {
  return (
    <span
      className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-[linear-gradient(135deg,#ff6f61,#8a6dff)] text-white shadow-[0_0_30px_rgba(125,96,255,0.35)]"
      aria-hidden="true"
    >
      <span className="absolute h-6 w-6 rounded-full border border-white/75" />
      <span className="absolute h-2 w-2 translate-x-[7px] -translate-y-[7px] rounded-full bg-white shadow-[0_0_10px_white]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
    </span>
  );
}
