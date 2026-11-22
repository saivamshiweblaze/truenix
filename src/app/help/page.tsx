"use client";

import { useState } from "react";
import { PublicFooter, PublicHeader } from "@/components/shell/public-chrome";
import { Accordion } from "@/components/ui/tabs";
import { useAppSnapshot } from "@/lib/store/store";
import { publishedCms } from "@/lib/store/selectors";

/** Help articles and FAQs, managed in Admin › Site content. Plain text only. */
export default function HelpPage() {
  const { state } = useAppSnapshot();
  const faqs = publishedCms(state, "faq");
  const articles = publishedCms(state, "help");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <PublicHeader />
      <main id="main" className="mx-auto max-w-[860px] px-4 pb-20 pt-12 md:px-8 md:pt-16">
        <h1 className="text-display font-extrabold">Help and FAQs</h1>
        <p className="mt-3 max-w-2xl text-body text-sub">Answers to common questions about TRUEVIX.</p>
        {articles.length > 0 && (
          <section aria-labelledby="guides" className="mt-12">
            <h2 id="guides" className="text-section font-bold">
              Guides
            </h2>
            <div className="mt-4 flex flex-col gap-8">
              {articles.map((a) => (
                <article key={a.id} className="border-t border-line pt-5">
                  <h3 className="text-post font-bold">{a.published!.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-body text-charcoal">{a.published!.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        <section aria-labelledby="faqs" className="mt-12">
          <h2 id="faqs" className="text-section font-bold">
            Frequently asked questions
          </h2>
          {faqs.length ? (
            <div className="mt-3 border-t border-line">
              {faqs.map((f) => (
                <Accordion key={f.id} title={f.published!.question} open={open === f.id} onToggle={() => setOpen(open === f.id ? null : f.id)}>
                  <p className="whitespace-pre-line text-body text-charcoal">{f.published!.answer}</p>
                </Accordion>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-ui text-sub">No questions published yet.</p>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
