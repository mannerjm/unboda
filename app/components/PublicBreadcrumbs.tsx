import Link from "next/link";
import { buildBreadcrumbStructuredData, type PublicBreadcrumbItem } from "@/app/lib/structuredData";
import StructuredData from "./StructuredData";

export default function PublicBreadcrumbs({ items }: { items: readonly PublicBreadcrumbItem[] }) {
  return (
    <>
      <nav aria-label="사이트 경로" className="mb-4 text-xs leading-6 text-slate-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map((item, index) => (
            <li key={item.path} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {index === items.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path} className="underline underline-offset-4 hover:text-[#5949bd]">{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <StructuredData data={buildBreadcrumbStructuredData(items)} />
    </>
  );
}
