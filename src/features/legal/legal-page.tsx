import type { ReactNode } from "react";
import { PublicFooter, PublicHeader } from "@/components/shell/public-chrome";

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: { heading: string; body: ReactNode }[] }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <PublicHeader />
      <main id="main" className="mx-auto max-w-[760px] px-4 pb-24 pt-14 md:px-8 md:pt-20">
        <p className="eyebrow">Last updated {updated}</p>
        <h1 className="mt-3 text-display font-extrabold">{title}</h1>
        <div className="mt-6 rounded-md border border-line bg-surface px-4 py-3.5 text-meta text-sub">{intro}</div>
        <div className="mt-10 flex flex-col gap-9">
          {sections.map((s, i) => (
            <section key={s.heading} aria-labelledby={`legal-${i}`}>
              <h2 id={`legal-${i}`} className="text-section font-bold">
                {i + 1}. {s.heading}
              </h2>
              <div className="mt-2.5 text-body text-charcoal [&_li]:mt-1.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">{s.body}</div>
            </section>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
