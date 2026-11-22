"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowUpRight, Bookmark, Cpu, FileSearch, Hammer, Handshake, Heart, HelpCircle, Lightbulb, MessageSquare, MessagesSquare, Rocket, Share2, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import type { Post, PostFigure, PostKind } from "@/lib/types";
import { Avatar } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { industryLabel, POST_KIND_LABEL, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { commentCount, ideaById, personById } from "@/lib/store/selectors";
import { toggleFollowPerson, toggleLike, toggleSavePost } from "@/lib/store/actions";
import { cn, timeAgo } from "@/lib/utils";
import { CommentThread } from "./comments";

/** Each kind of post has its own marker so problems, findings, updates and projects read differently. */
export const POST_KIND_ICON: Record<PostKind, LucideIcon> = {
  problem: AlertCircle,
  research: FileSearch,
  founder_update: Rocket,
  project: Hammer,
  idea: Lightbulb,
  technology: Cpu,
  trend: TrendingUp,
  collaboration: Handshake,
  challenge: Trophy,
  question: HelpCircle,
  discussion: MessagesSquare,
};

/** Bodies longer than this are clamped to four lines until the reader expands them. */
const CLAMP_AT = 240;

function Action({ onClick, active, label, children, pressedLabel }: { onClick: () => void; active?: boolean; label: string; pressedLabel?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active && pressedLabel ? pressedLabel : label}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-sm px-2.5 text-meta transition-colors active:scale-95 sm:justify-start",
        active ? "font-medium text-ink" : "text-sub hover:bg-surface hover:text-ink",
      )}
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
  const [expanded, setExpanded] = useState(false);
  const count = commentCount(s, post.id);
  const mine = post.authorId === "me";
  const profileHref = mine ? "/profile" : `/people/${post.authorId}`;
  const long = post.body.length > CLAMP_AT;

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
    <article
      id={post.id}
      aria-labelledby={`${post.id}-title`}
      className="scroll-mt-24 border-b border-line py-5 max-sm:-mx-4 max-sm:border-b-8 max-sm:border-surface max-sm:px-4 sm:py-6"
    >
      {/* Who, and what kind of post */}
      <header className="flex items-start gap-3">
        <Link href={profileHref} aria-hidden tabIndex={-1} className="shrink-0">
          <Avatar name={author?.name ?? "Member"} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={profileHref} className="truncate text-ui font-semibold text-ink hover:underline">
              {author?.name ?? "Member"}
            </Link>
            {!mine && (
              <button
                type="button"
                aria-pressed={following}
                onClick={() => {
                  toggleFollowPerson(post.authorId);
                  toast(following ? `Unfollowed ${author?.name}` : `Following ${author?.name}`);
                }}
                className={cn(
                  "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-micro font-medium transition-colors",
                  following ? "bg-surface text-sub hover:text-ink" : "border border-line-strong text-ink hover:border-ink",
                )}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>
          <p className="truncate text-meta text-sub">
            {author?.headline}
            <span className="text-mute">
              <span aria-hidden> · </span>
              <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </span>
          </p>
        </div>
      </header>

      {/* What it is about */}
      <div className="mt-3.5 sm:pl-[52px]">
        <PostKindLabel kind={post.kind} />
        <h3 id={`${post.id}-title`} className="mt-1.5 text-post font-bold text-ink">
          {post.title}
        </h3>
        <p className={cn("mt-1.5 max-w-[66ch] whitespace-pre-line text-body text-charcoal", long && !expanded && "line-clamp-4")}>{post.body}</p>
        {long && (
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mt-1 text-meta font-medium text-sub hover:text-ink">
            {expanded ? "Collapse post" : "Read full post"}
          </button>
        )}

        {post.figure && <Figure figure={post.figure} />}

        {idea && (
          <Link href={`/ideas/${idea.id}`} className="group mt-4 flex items-center gap-3 rounded-md border border-line p-3 transition-colors hover:border-line-strong hover:bg-surface/60">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-surface text-ink">
              <Hammer size={17} strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui font-semibold text-ink">{idea.title.split(":")[0]}</span>
              <span className="block truncate text-meta text-sub">
                {stageLabel(idea.stage)} · {industryLabel(idea.industry)}
              </span>
            </span>
            <span className="hidden shrink-0 items-center gap-1 text-meta font-medium text-ink sm:inline-flex">
              View project <ArrowUpRight size={14} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}

        {/* Why it is relevant */}
        <p className="mt-3 text-micro text-mute">{post.industries.map(industryLabel).join(", ")}</p>

        {/* What you can do with it */}
        <div className="-mx-2.5 mt-2 grid grid-cols-4 items-center sm:flex sm:gap-1">
          <Action onClick={() => toggleLike(post.id)} active={liked} label="Appreciate" pressedLabel="Remove appreciation">
            <motion.span key={String(liked)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }} className="inline-flex">
              <Heart size={17} strokeWidth={1.8} className={liked ? "fill-accent text-accent-text" : ""} aria-hidden />
            </motion.span>
            <span className="tabular-nums">{post.likes + (liked ? 1 : 0)}</span>
          </Action>
          <Action onClick={() => setOpen((o) => !o)} active={open} label={`Comments, ${count}`}>
            <MessageSquare size={17} strokeWidth={1.8} aria-hidden />
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
            <Bookmark size={17} strokeWidth={1.8} className={saved ? "fill-ink" : ""} aria-hidden />
            <span className="max-sm:sr-only">{saved ? "Saved" : "Save"}</span>
          </Action>
          <Action onClick={share} label="Copy link to share">
            <Share2 size={17} strokeWidth={1.8} aria-hidden />
            <span className="max-sm:sr-only">Share</span>
          </Action>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="pt-3">
                <CommentThread targetId={post.id} autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

/** Kind of post as a quiet line, not a badge. Problems get the most weight: they are the platform's raw material. */
export function PostKindLabel({ kind }: { kind: PostKind }) {
  const Icon = POST_KIND_ICON[kind];
  return (
    <p className={cn("inline-flex items-center gap-1.5 text-micro", kind === "problem" ? "font-semibold text-ink" : "font-medium text-sub")}>
      <Icon size={13} aria-hidden />
      {POST_KIND_LABEL[kind]}
    </p>
  );
}

/** Kept for existing call sites. */
export const PostKindBadge = PostKindLabel;

/** Inline data figure, drawn from numbers the post states. */
function Figure({ figure }: { figure: PostFigure }) {
  if (figure.kind === "stat") {
    return (
      <figure className="mt-4 flex items-baseline gap-4 rounded-md bg-surface px-4 py-4 sm:px-5">
        <span className="shrink-0 font-display text-[2rem] font-bold leading-none tracking-tight text-ink tabular-nums sm:text-[2.25rem]">{figure.value}</span>
        <figcaption className="text-ui text-sub">{figure.label}</figcaption>
      </figure>
    );
  }
  const max = Math.max(...figure.items.map((i) => i.value));
  return (
    <figure className="mt-4 rounded-md bg-surface px-4 py-4 sm:px-5">
      <figcaption className="text-meta font-medium text-ink">{figure.caption}</figcaption>
      <ul className="mt-3 flex flex-col gap-2.5">
        {figure.items.map((i) => (
          <li key={i.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 text-meta sm:grid-cols-[9rem_1fr]">
            <span className="truncate text-sub">{i.label}</span>
            <span className="flex items-center gap-2">
              <span aria-hidden className={cn("h-2.5 rounded-full", i.highlight ? "bg-accent" : "bg-line-strong")} style={{ width: `${Math.max(4, (i.value / max) * 100)}%` }} />
              <span className={cn("shrink-0 tabular-nums", i.highlight ? "font-semibold text-ink" : "text-sub")}>
                {i.value}
                {figure.unit}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
