"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Heart, MessageSquare, Share2 } from "lucide-react";
import type { Post } from "@/lib/types";
import { Avatar, DemoMark, TagList } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { industryLabel, POST_KIND_LABEL, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { commentCount, ideaById, personById } from "@/lib/store/selectors";
import { toggleFollowPerson, toggleLike, toggleSavePost } from "@/lib/store/actions";
import { cn, timeAgo } from "@/lib/utils";
import { CommentThread } from "./comments";

function Action({ onClick, active, label, children, pressedLabel }: { onClick: () => void; active?: boolean; label: string; pressedLabel?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active && pressedLabel ? pressedLabel : label}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-meta transition-colors active:scale-95", active ? "text-ink" : "text-sub hover:bg-surface hover:text-ink")}
    >
      {children}
    </button>
  );
}

export function PostCard({ post }: { post: Post }) {
  const s = useAppState();
  const author = personById(s, post.authorId);
  const idea = post.ideaId ? ideaById(s, post.ideaId) : undefined;
  const liked = s.liked.includes(post.id);
  const saved = s.saved.posts.includes(post.id);
  const following = s.following.people.includes(post.authorId);
  const [open, setOpen] = useState(false);
  const count = commentCount(s, post.id);

  const share = async () => {
    const url = `${window.location.origin}/discover#${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", { body: "Share it with anyone who has access." });
    } catch {
      toast("Copy failed", { body: url });
    }
  };

  return (
    <article id={post.id} className="scroll-mt-24 border-b border-line py-6 first:pt-2" aria-labelledby={`${post.id}-title`}>
      <div className="flex items-start gap-3">
        <Link href={post.authorId === "me" ? "/profile" : `/people/${post.authorId}`} aria-hidden tabIndex={-1}>
          <Avatar name={author?.name ?? "Member"} size={38} me={post.authorId === "me"} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={post.authorId === "me" ? "/profile" : `/people/${post.authorId}`} className="text-ui font-medium text-ink hover:underline">
              {author?.name ?? "Member"}
            </Link>
            {post.authorId !== "me" && (
              <button
                type="button"
                onClick={() => {
                  toggleFollowPerson(post.authorId);
                  toast(following ? `Unfollowed ${author?.name}` : `Following ${author?.name}`);
                }}
                className="text-meta text-sub hover:text-ink"
              >
                {following ? "· Following" : "· Follow"}
              </button>
            )}
          </div>
          <p className="truncate text-meta text-sub">{author?.headline}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-micro text-mute">{timeAgo(post.createdAt)}</span>
          {post.demo && <DemoMark />}
        </div>
      </div>

      <div className="mt-4 sm:pl-[50px]">
        <p className="text-micro font-medium text-sub">{POST_KIND_LABEL[post.kind]}</p>
        <h3 id={`${post.id}-title`} className="mt-1 text-[1.0625rem] font-semibold leading-snug tracking-tight text-ink">
          {post.title}
        </h3>
        <p className="mt-2 max-w-[68ch] whitespace-pre-line text-body text-charcoal">{post.body}</p>

        {idea && (
          <Link href={`/ideas/${idea.id}`} className="group mt-4 flex items-center justify-between gap-4 border-l-2 border-ink bg-surface px-4 py-3 transition-colors hover:bg-sunken">
            <span className="min-w-0">
              <span className="block text-micro text-sub">Project · {stageLabel(idea.stage)}</span>
              <span className="block truncate text-ui font-medium text-ink">{idea.title.split(":")[0]}</span>
            </span>
            <span className="shrink-0 text-meta text-sub group-hover:text-ink">View project</span>
          </Link>
        )}

        <TagList items={post.industries.map(industryLabel)} className="mt-4" />

        <div className="-ml-2 mt-3 flex flex-wrap items-center gap-1">
          <Action onClick={() => toggleLike(post.id)} active={liked} label="Appreciate" pressedLabel="Remove appreciation">
            <motion.span key={String(liked)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
              <Heart size={16} className={liked ? "fill-accent text-accent" : ""} aria-hidden />
            </motion.span>
            <span className="tabular-nums">{post.likes + (liked ? 1 : 0)}</span>
          </Action>
          <Action onClick={() => setOpen((o) => !o)} active={open} label={`Comments, ${count}`}>
            <MessageSquare size={16} aria-hidden />
            <span className="tabular-nums">{count}</span>
          </Action>
          <Action
            onClick={() => {
              toggleSavePost(post.id);
              toast(saved ? "Removed from saved" : "Saved to your workspace");
            }}
            active={saved}
            label="Save"
            pressedLabel="Unsave"
          >
            <Bookmark size={16} className={saved ? "fill-ink" : ""} aria-hidden />
            {saved ? "Saved" : "Save"}
          </Action>
          <Action onClick={share} label="Copy link to share">
            <Share2 size={16} aria-hidden />
            Share
          </Action>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="pt-4">
                <CommentThread targetId={post.id} autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
