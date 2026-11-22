"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { commentsFor, personById } from "@/lib/store/selectors";
import { addComment, deleteComment } from "@/lib/store/actions";
import { timeAgo } from "@/lib/utils";

export function CommentThread({ targetId, autoFocus, placeholder = "Add a thoughtful comment" }: { targetId: string; autoFocus?: boolean; placeholder?: string }) {
  const s = useAppState();
  const list = commentsFor(s, targetId);
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(targetId, text);
    setText("");
    toast("Comment posted");
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {list.map((c) => {
            const p = personById(s, c.authorId);
            return (
              <motion.li key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
                <Avatar name={p?.name ?? "Member"} size={28} me={c.authorId === "me"} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={c.authorId === "me" ? "/profile" : `/people/${c.authorId}`} className="text-meta font-medium text-ink hover:underline">
                      {p?.name ?? "Member"}
                    </Link>
                    <span className="text-micro text-mute">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-ui text-charcoal">{c.body}</p>
                  {c.authorId === "me" && (
                    <button type="button" onClick={() => deleteComment(c.id)} className="mt-1 text-micro text-mute hover:text-ink">
                      Delete
                    </button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor={`c-${targetId}`} className="sr-only">
          Comment
        </label>
        <textarea
          id={`c-${targetId}`}
          autoFocus={autoFocus}
          rows={1}
          value={text}
          maxLength={1500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder={placeholder}
          className="min-h-9 flex-1 resize-none rounded-sm border border-line-strong bg-paper px-3 py-2 text-ui placeholder:text-mute focus:border-ink focus:outline-none"
        />
        <Button type="submit" size="md" disabled={!text.trim()}>
          Post
        </Button>
      </form>
    </div>
  );
}
