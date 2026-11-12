"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, MessageSquare, Sparkles, UserPlus, Users, ScanSearch, ClipboardCheck, Info, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoMark, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { allNotifications } from "@/lib/store/selectors";
import type { Notification } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const ICONS: Record<Notification["kind"], typeof Bell> = {
  comment: MessageSquare,
  follow: UserPlus,
  collaboration: Users,
  opportunity: Sparkles,
  research: ScanSearch,
  review: ClipboardCheck,
  system: Info,
  message: Mail,
};

export default function NotificationsPage() {
  const s = useAppState();
  const [view, setView] = useState<"all" | "unread">("all");
  const all = allNotifications(s);
  const list = view === "unread" ? all.filter((n) => !n.read) : all;
  const unread = all.filter((n) => !n.read);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Replies, follows, deadlines and collaboration requests."
        actions={
          <Button
            variant="secondary"
            disabled={!unread.length}
            onClick={() => {
              markAllNotificationsRead(unread.map((n) => n.id));
              toast("All notifications marked as read");
            }}
          >
            Mark all as read
          </Button>
        }
      />
      <Tabs
        label="Notification filter"
        value={view}
        onChange={setView}
        items={[
          { value: "all", label: "All", count: all.length },
          { value: "unread", label: "Unread", count: unread.length },
        ]}
      />
      {list.length ? (
        <ul className="max-w-3xl">
          {list.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <li key={n.id} className="relative border-b border-line">
                <Link href={n.href} onClick={() => markNotificationRead(n.id)} className="flex gap-4 py-4 transition-colors hover:bg-surface/60 md:px-2">
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", n.read ? "bg-surface text-sub" : "bg-ink text-white")}>
                    <Icon size={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-ui", n.read ? "text-charcoal" : "font-medium text-ink")}>{n.title}</span>
                    <span className="block truncate text-meta text-sub">{n.body}</span>
                    <span className="mt-1 flex items-center gap-2 text-micro text-mute">
                      {timeAgo(n.createdAt)}
                      {n.demo && <DemoMark />}
                    </span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState title="You are all caught up" body="New replies and deadlines will appear here." />
        </div>
      )}
    </>
  );
}
