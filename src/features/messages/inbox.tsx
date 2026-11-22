"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, SampleMark, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/tabs";
import { sendMessage } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { allThreads, messagesFor, personById } from "@/lib/store/selectors";
import { cn, timeAgo } from "@/lib/utils";

const KIND_LABEL = { direct: "Message", collaboration_request: "Collaboration request", review_request: "Review request" };

export function Inbox() {
  const s = useAppState();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<"all" | "collaboration_request" | "review_request">("all");
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const threads = allThreads(s).filter((t) => filter === "all" || t.kind === filter);
  const activeId = params.get("thread");
  const active = allThreads(s).find((t) => t.id === activeId);
  const messages = active ? messagesFor(s, active.id) : [];
  const other = active ? personById(s, active.participantId) : undefined;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeId]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    sendMessage(active.id, text);
    setText("");
  };

  return (
    <>
      <PageHeader title="Messages" description="Direct messages, collaboration requests and review requests. Seeded people are fictional and do not reply." />
      <div className="grid min-h-[60dvh] border-y border-line md:grid-cols-[320px_minmax(0,1fr)] md:border">
        <aside className={cn("flex flex-col border-line md:border-r", active && "hidden md:flex")}>
          <div className="border-b border-line p-3">
            <Segmented
              label="Inbox filter"
              value={filter}
              onChange={setFilter}
              items={[
                { value: "all", label: "All" },
                { value: "collaboration_request", label: "Collaboration" },
                { value: "review_request", label: "Reviews" },
              ]}
            />
          </div>
          <ul className="flex-1 overflow-y-auto">
            {threads.map((t) => {
              const p = personById(s, t.participantId);
              const last = messagesFor(s, t.id).at(-1);
              return (
                <li key={t.id}>
                  <Link
                    href={`/messages?thread=${t.id}`}
                    scroll={false}
                    aria-current={t.id === activeId ? "true" : undefined}
                    className={cn("flex gap-3 border-b border-line px-4 py-3.5 transition-colors", t.id === activeId ? "bg-surface" : "hover:bg-surface/60")}
                  >
                    <Avatar name={p?.name ?? "Member"} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-ui font-medium">{p?.name}</span>
                        {last && <span className="shrink-0 text-micro text-mute">{timeAgo(last.createdAt)}</span>}
                      </span>
                      <span className="block truncate text-meta text-sub">{t.subject}</span>
                      <span className="block text-micro text-mute">{KIND_LABEL[t.kind]}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {!threads.length && <li className="p-4 text-meta text-sub">No conversations of this type.</li>}
          </ul>
        </aside>

        <section className={cn("flex min-h-[60dvh] flex-col", !active && "hidden md:flex")} aria-label="Conversation">
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button type="button" onClick={() => router.push("/messages")} aria-label="Back to conversations" className="rounded-sm p-1 text-sub hover:bg-surface md:hidden">
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={other?.name ?? "Member"} size={32} />
                <div className="min-w-0 flex-1">
                  <Link href={`/people/${active.participantId}`} className="text-ui font-medium hover:underline">
                    {other?.name}
                  </Link>
                  <p className="truncate text-meta text-sub">{active.subject}</p>
                </div>
                {other?.demo && <SampleMark title="Sample contact. Messages are saved in your inbox but aren’t delivered.">Sample contact</SampleMark>}
              </header>
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <ul className="flex flex-col gap-3">
                  {messages.map((m) => {
                    const mine = m.authorId === "me";
                    return (
                      <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[78%] rounded-md px-3.5 py-2.5 text-ui", mine ? "bg-ink text-white" : "bg-surface text-ink")}>
                          <p className="whitespace-pre-line">{m.body}</p>
                          <p className={cn("mt-1 text-micro", mine ? "text-white/60" : "text-mute")}>{timeAgo(m.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
                <label htmlFor="msg" className="sr-only">
                  Write a message
                </label>
                <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Write a message" className="h-10 flex-1 rounded-sm border border-line-strong px-3 text-ui focus:border-ink focus:outline-none" />
                <Button type="submit" disabled={!text.trim()} aria-label="Send message">
                  <Send size={15} aria-hidden />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState title="Choose a conversation" body="Select a conversation on the left, or message someone from their profile." />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
