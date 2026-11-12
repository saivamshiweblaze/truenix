"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, RadioCard, TextArea, TextField } from "@/components/ui/field";
import { Progress } from "@/components/ui/primitives";
import { Logo } from "@/components/shell/logo";
import { SessionGate } from "@/components/shell/session-gate";
import { BulbArt, CompassArt } from "@/components/illustrations/art";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { EXPERIENCE, INDUSTRIES, SELF_SERVE_ROLES, SKILLS } from "@/config/taxonomy";
import { completeOnboarding } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import type { ExperienceLevel, IndustryId, RoleId } from "@/lib/types";

const STEPS = ["Role", "Profile", "Interests", "Skills", "Industries", "Experience"] as const;

function Onboarding() {
  const router = useRouter();
  const user = useAppState().user!;
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState(false);
  const [role, setRole] = useState<RoleId>(user.role);
  const [profile, setProfile] = useState({ headline: user.headline, organisation: user.organisation, location: user.location, bio: user.bio });
  const [interests, setInterests] = useState<IndustryId[]>(user.interests);
  const [skills, setSkills] = useState<string[]>(user.skills);
  const [industries, setIndustries] = useState<IndustryId[]>(user.industries);
  const [experience, setExperience] = useState<ExperienceLevel>(user.experience);
  const [error, setError] = useState<string>();

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const validate = () => {
    if (step === 1 && profile.headline.trim().length < 4) return "Add a short headline so people know what you do.";
    if (step === 2 && interests.length < 1) return "Choose at least one interest. You can change it later.";
    return undefined;
  };

  const next = () => {
    const err = validate();
    setError(err);
    if (err) return;
    if (step === STEPS.length - 1) {
      completeOnboarding({ role, ...profile, interests, skills, industries: industries.length ? industries : interests, experience });
      setDone(true);
      return;
    }
    setDir(1);
    setStep((s) => s + 1);
  };
  const back = () => {
    setError(undefined);
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  if (done) {
    const explorer = role === "student_explorer" || role === "participant";
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
        {explorer ? <CompassArt size={64} /> : <BulbArt size={64} />}
        <div>
          <h1 className="text-title font-semibold">You are set up, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-body text-sub">
            {explorer
              ? "Start by reading the problems people in your chosen industries are working on. You do not need an idea to begin."
              : "Your home page is arranged around what you told us. Start with your idea, or see who else is working nearby."}
          </p>
        </div>
        <JourneyLine current={explorer ? 0 : 1} />
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" size="lg" onClick={() => router.push("/home")}>
            Go to your home page
          </Button>
          <Button variant="secondary" size="lg" onClick={() => router.push(explorer ? "/discover" : "/ideas/new")}>
            {explorer ? "Start discovering" : "Submit your idea"}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-meta text-sub">
          <span>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
          {step > 0 && (
            <button type="button" onClick={back} className="inline-flex items-center gap-1 hover:text-ink">
              <ArrowLeft size={14} aria-hidden /> Back
            </button>
          )}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} label="Onboarding progress" />
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-5"
          aria-labelledby="step-title"
        >
          {step === 0 && (
            <>
              <StepTitle title="What brings you here?" body="This shapes your home page. You can change it any time in settings." />
              <div className="flex flex-col gap-2">
                {SELF_SERVE_ROLES.map((r) => (
                  <RadioCard key={r.id} name="role" value={r.id} checked={role === r.id} onChange={(v) => setRole(v as RoleId)} title={r.label} description={r.description} />
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <StepTitle title="Set up your profile" body="A clear headline helps founders and experts decide whether to connect." />
              <TextField label="Headline" placeholder="e.g. Mechanical engineering student interested in clean energy" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} maxLength={140} />
              <TextField label="Institution or organisation" optional value={profile.organisation} onChange={(e) => setProfile({ ...profile, organisation: e.target.value })} maxLength={100} />
              <TextField label="Location" optional placeholder="City, country" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} maxLength={80} />
              <TextArea label="About you" optional rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={600} />
            </>
          )}
          {step === 2 && (
            <>
              <StepTitle title="What are you curious about?" body="Pick the areas you want to see on Discover. Choose as many as you like." />
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => (
                  <ChoiceChip key={i.id} selected={interests.includes(i.id)} onToggle={() => setInterests((l) => toggle(l, i.id))}>
                    {i.label}
                  </ChoiceChip>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <StepTitle title="What can you contribute?" body="Founders search by skill when they look for collaborators. Skip this if you are still learning." />
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => (
                  <ChoiceChip key={s} selected={skills.includes(s)} onToggle={() => setSkills((l) => toggle(l, s))}>
                    {s}
                  </ChoiceChip>
                ))}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <StepTitle title="Which industries do you know or work in?" body="Used for expert matching and review requests. Leave empty to reuse your interests." />
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => (
                  <ChoiceChip key={i.id} selected={industries.includes(i.id)} onToggle={() => setIndustries((l) => toggle(l, i.id))}>
                    {i.label}
                  </ChoiceChip>
                ))}
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <StepTitle title="How much experience do you have?" body="This helps us suggest mentors and opportunities that fit." />
              <div className="flex flex-col gap-2">
                {EXPERIENCE.map((x) => (
                  <RadioCard key={x.id} name="experience" value={x.id} checked={experience === x.id} onChange={(v) => setExperience(v as ExperienceLevel)} title={x.label} description="" />
                ))}
              </div>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-meta text-accent-ink">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
        <span className="text-meta text-mute">Saved in this browser only</span>
        <Button variant={step === STEPS.length - 1 ? "accent" : "primary"} size="lg" onClick={next}>
          {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 id="step-title" className="text-title font-semibold">
        {title}
      </h1>
      <p className="mt-2 text-body text-sub">{body}</p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <SessionGate requireOnboarded={false}>
      <div className="min-h-dvh px-5 py-6 sm:px-10">
        <Logo href="/" />
        <main id="main" className="mx-auto max-w-xl py-10 md:py-16">
          <Onboarding />
        </main>
      </div>
    </SessionGate>
  );
}
