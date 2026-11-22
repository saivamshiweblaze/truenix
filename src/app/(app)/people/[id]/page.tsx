"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { allPeople, feedPosts, isPersonListed, publicIdeas } from "@/lib/store/selectors";
import { startThread, toggleConnect, toggleFollowPerson } from "@/lib/store/actions";
import { ProfileView } from "@/features/community/profile-view";

function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useAppState();
  const person = allPeople(s).find((p) => p.id === id);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState("");

  if (!person || !isPersonListed(s, person.id)) {
    return <EmptyState title="Profile not available" body="This member may have left or the link may be wrong." action={<ButtonLink href="/community?tab=people">Browse people</ButtonLink>} />;
  }
  const following = s.following.people.includes(person.id);
  const requested = s.connections.includes(person.id);

  return (
    <>
      <ProfileView
        person={person}
        ideas={publicIdeas(s).filter((i) => i.ownerId === person.id)}
        posts={feedPosts(s).filter((p) => p.authorId === person.id)}
        actions={
          <>
            <Button
              variant={requested ? "secondary" : "primary"}
              onClick={() => {
                toggleConnect(person.id);
                toast(requested ? "Request withdrawn" : "Connection request sent", { body: requested || !person.demo ? undefined : "This is a sample profile, so requests aren’t delivered." });
              }}
            >
              {requested ? "Request sent" : "Connect"}
            </Button>
            <Button
              variant="secondary"
              aria-pressed={following}
              onClick={() => {
                toggleFollowPerson(person.id);
                toast(following ? `Unfollowed ${person.name}` : `Following ${person.name}`);
              }}
            >
              {following ? "Following" : "Follow"}
            </Button>
            <Button variant="ghost" onClick={() => setMsgOpen(true)}>
              Message
            </Button>
          </>
        }
      />
      <Dialog
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        title={`Message ${person.name}`}
        description={person.demo ? "This is a sample profile. Your message is saved in your inbox but isn’t delivered." : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMsgOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!msg.trim()}
              onClick={() => {
                const t = startThread(person.id, `Conversation with ${person.name}`, msg);
                setMsgOpen(false);
                toast("Message sent");
                router.push(`/messages?thread=${t}`);
              }}
            >
              Send message
            </Button>
          </>
        }
      >
        <TextArea label="Message" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} />
      </Dialog>
    </>
  );
}

export default function PersonPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PersonProfile />
    </Suspense>
  );
}
