"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { PublicFooter, PublicHeader } from "@/components/shell/public-chrome";
import { HeroScene } from "@/components/illustrations/hero-scene";
import { BuildArt, BulbArt, CollabArt, CompassArt, FlaskArt, FounderArt, GrowthArt, LensArt, NetworkArt, SparkArt, BlueprintArt, PathArt } from "@/components/illustrations/art";
import { useAppSnapshot } from "@/lib/store/store";
import { cmsFields } from "@/lib/store/selectors";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const STAGES = [
  { n: "01", title: "Discover", body: "Read problems people face across sixteen industries, and the projects already working on them.", art: <CompassArt size={72} /> },
  { n: "02", title: "Research", body: "Turn a hunch into a structured question about markets, competitors, customers and regulation.", art: <LensArt size={72} /> },
  { n: "03", title: "Validate", body: "Test assumptions in twelve areas, with guesses, analysis and real customer evidence kept apart.", art: <FlaskArt size={72} /> },
  { n: "04", title: "Connect", body: "Find collaborators by skill, ask experts for review, and recruit people to learn from.", art: <NetworkArt size={72} /> },
  { n: "05", title: "Build", body: "Track your idea’s progress and find incubators, grants and programmes that fit its stage.", art: <BuildArt size={72} /> },
];

const CAPABILITIES = [
  {
    id: "researcher",
    eyebrow: "AI Researcher",
    title: "Research that shows its working",
    body: "Ask a question about a market, a competitor or a customer group. The AI Researcher structures the answer into a report you can save, compare and attach to an idea — with sources and assumptions listed separately from conclusions.",
    points: ["Market, competitor, customer and regulatory lenses", "Scan, standard and deep research depths", "Reports link directly to your ideas and validation work"],
    note: "Live web sources are being connected. Every report states where its content came from.",
    art: <LensArt size={168} />,
    fragment: (
      <div className="flex flex-col gap-2">
        <span className="text-micro text-mute">Research question</span>
        <span className="font-display text-ui font-bold leading-snug">Who buys cold-chain capacity for small exporters?</span>
        <span className="flex flex-wrap gap-1.5 text-micro">
          {["Market", "Competitors", "Customers"].map((x) => (
            <span key={x} className="rounded-xs border border-line-strong px-1.5 py-0.5 font-medium text-charcoal">{x}</span>
          ))}
        </span>
      </div>
    ),
  },
  {
    id: "validation",
    eyebrow: "Validation",
    title: "Evidence, not enthusiasm",
    body: "A validation workspace with twelve areas — from problem and market to feasibility and experiments. Each piece of evidence is labelled by type, so an AI suggestion never passes for a customer’s answer.",
    points: ["Six evidence types, from assumption to experiment result", "Open questions you can track and resolve", "Notes and status for every validation area"],
    art: <FlaskArt size={168} />,
    fragment: (
      <div className="flex flex-wrap items-center gap-1.5 text-micro">
        <span className="rounded-xs border border-dashed border-line-strong px-1.5 py-0.5 text-sub">Assumption</span>
        <span className="rounded-xs border border-dashed border-ink px-1.5 py-0.5 text-ink">AI analysis</span>
        <span className="rounded-xs bg-ink px-1.5 py-0.5 text-white">Expert opinion</span>
        <span className="rounded-xs border border-positive bg-positive-wash px-1.5 py-0.5 text-positive-ink">Customer response</span>
      </div>
    ),
  },
  {
    id: "community",
    eyebrow: "Community",
    title: "People organised around problems",
    body: "Profiles built on skills, interests and what each person is open to. Founders find collaborators, students find projects, and experts find ideas worth reviewing.",
    points: ["Search people by skill and industry", "Collaboration requests tied to specific ideas", "Questions, discussions and founder updates"],
    art: <CollabArt size={168} />,
    fragment: (
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 shrink-0 rounded-full bg-charcoal" />
        <span className="min-w-0 flex-1">
          <span className="block text-ui font-semibold">Embedded engineer wanted</span>
          <span className="block text-micro text-sub">Needs: Embedded systems, Hardware</span>
        </span>
        <span className="rounded-sm bg-accent px-2.5 py-1 text-micro font-semibold text-accent-ink">Offer help</span>
      </div>
    ),
  },
  {
    id: "opportunities",
    eyebrow: "Opportunities & incubation",
    title: "The next step, matched to your stage",
    body: "Incubators, accelerators, grants, hackathons and university programmes in one list, filtered by industry, stage and deadline — with a tracker for the ones you are preparing for.",
    points: ["Filter by stage, industry and deadline", "Track interest, preparation and submission", "Institution programmes alongside open calls"],
    art: <GrowthArt size={168} />,
    fragment: (
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-micro text-sub">Pre-incubation programme</span>
          <span className="block text-ui font-semibold">Closes in 12 days</span>
        </span>
        <span className="flex items-center gap-1.5 text-micro text-sub">
          <span className="h-2 w-2 rounded-full bg-ink" /> Preparing
        </span>
      </div>
    ),
  },
];

const AUDIENCES = [
  { title: "Students", body: "Explore real problems, join projects and build a profile that shows what you can do.", art: <BulbArt size={56} /> },
  { title: "Founders", body: "Research, validate and staff your venture without stitching together six tools.", art: <FounderArt size={56} /> },
  { title: "Industry professionals", body: "Share what you know about your field and spot ventures worth joining.", art: <BlueprintArt size={56} /> },
  { title: "Experts and mentors", body: "Review ideas in your domain and guide founders through early decisions.", art: <PathArt size={56} /> },
  { title: "Research participants", body: "Take part in interviews and studies that help founders build the right thing.", art: <SparkArt size={56} /> },
  { title: "Institutions", body: "Run innovation programmes and follow your students’ projects in one place.", art: <NetworkArt size={56} /> },
];

export default function WelcomePage() {
  const { state, hydrated } = useAppSnapshot();
  const signedIn = Boolean(hydrated && state.signedIn && state.user);
  // Hero copy is managed in Admin › Site content; the built-in text is the fallback when unpublished.
  const published = cmsFields(state, "home-hero");
  const hero = {
    eyebrow: published?.eyebrow || "For students, founders, experts and institutions",
    headline: published?.headline || "From a problem worth solving to a project worth building.",
    subheading: published?.subheading || `${brand.productName} brings startup discovery, market research, idea validation and collaboration into one workspace — for students, founders, professionals and the institutions that support them.`,
    footnote: published ? published.footnote : "Arrive with an idea, or with nothing but curiosity.",
  };
  const reduce = useReducedMotion();
  const enter = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease: EASE, delay } });

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <a href="#main" className="sr-only z-[90] rounded-sm bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <PublicHeader />

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-4 pb-16 pt-10 md:px-8 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-24">
          <div>
            <motion.p {...enter(0)} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-meta text-sub">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              {hero.eyebrow}
            </motion.p>
            <motion.h1 {...enter(0.05)} className="mt-5 max-w-[15ch] text-hero font-extrabold text-ink">
              {hero.headline}
            </motion.h1>
            <motion.p {...enter(0.15)} className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-sub">
              {hero.subheading}
            </motion.p>
            <motion.div {...enter(0.25)} className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href={signedIn ? "/home" : "/register"} variant="accent" size="lg">
                {signedIn ? "Continue to your workspace" : "Create your account"} <ArrowRight size={17} aria-hidden />
              </ButtonLink>
              <ButtonLink href="#journey" variant="secondary" size="lg">
                See how it works
              </ButtonLink>
            </motion.div>
            {hero.footnote && (
              <motion.p {...enter(0.35)} className="mt-6 text-meta text-mute">
                {hero.footnote}
              </motion.p>
            )}
          </div>
          <HeroScene />
        </section>

        {/* Journey */}
        <section id="journey" aria-labelledby="journey-title" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">How it works</p>
              <h2 id="journey-title" className="mt-3 text-display font-extrabold">
                One path from curiosity to a venture you can defend.
              </h2>
              <p className="mt-4 text-body text-sub">Each stage feeds the next. Research attaches to ideas, evidence attaches to research, and the people you meet along the way stay connected to the work.</p>
            </Reveal>
            <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
              <span aria-hidden className="absolute left-0 right-0 top-[48px] hidden h-px bg-line-strong lg:block" />
              {STAGES.map((s, i) => (
                <Reveal as="li" key={s.n} delay={i * 0.08} className="group relative lg:px-4 lg:first:pl-0 lg:last:pr-0">
                  <div className="relative flex h-[96px] w-[96px] items-center justify-center rounded-lg border border-line bg-paper">
                    {s.art}
                  </div>
                  <p className="mt-5 font-mono text-micro text-mute">{s.n}</p>
                  <h3 className="mt-1 text-section font-bold">{s.title}</h3>
                  <p className="mt-2 text-meta leading-relaxed text-sub">{s.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" aria-labelledby="cap-title" className="scroll-mt-20">
          <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Capabilities</p>
              <h2 id="cap-title" className="mt-3 text-display font-extrabold">
                The working tools of early-stage innovation, in one place.
              </h2>
            </Reveal>
            <div className="mt-14 flex flex-col">
              {CAPABILITIES.map((c, i) => (
                <Reveal key={c.id} className="grid items-center gap-8 border-t border-line py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-16">
                  <div className={cn("relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-line bg-surface", i % 2 === 1 && "md:order-2")}>
                    <div className="dot-grid absolute inset-0 opacity-60" />
                    <div className="relative -translate-y-6">{c.art}</div>
                    <div className="absolute inset-x-5 bottom-5 rounded-md border border-line bg-paper px-4 py-3 shadow-card">{c.fragment}</div>
                  </div>
                  <div>
                    <p className="eyebrow">{c.eyebrow}</p>
                    <h3 className="mt-3 text-title font-bold">{c.title}</h3>
                    <p className="mt-4 max-w-xl text-body text-sub">{c.body}</p>
                    <ul className="mt-6 flex flex-col">
                      {c.points.map((p) => (
                        <li key={p} className="flex gap-3 border-t border-line py-2.5 text-ui text-charcoal">
                          <span aria-hidden className="mt-[0.6em] h-px w-3 shrink-0 bg-ink" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    {c.note && <p className="mt-4 text-meta text-mute">{c.note}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Two ways in */}
        <section aria-labelledby="ways-title" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Two ways in</p>
              <h2 id="ways-title" className="mt-3 text-display font-extrabold">
                You don’t need an idea to start.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {[
                { title: "You have an idea", art: <BulbArt size={72} />, steps: ["Submit it privately or as a public summary", "Research its market and competitors", "Test assumptions with real evidence", "Find collaborators and expert reviewers", "Find incubation and funding programmes"] },
                { title: "You are still looking", art: <CompassArt size={72} />, steps: ["Read problems people face in sixteen industries", "Follow founders and the projects they build", "Learn which technologies are changing what", "Contribute your skills to someone else’s project", "Let an idea find you"] },
              ].map((w, i) => (
                <Reveal key={w.title} delay={i * 0.08} className="rounded-lg border border-line bg-paper p-6 md:p-8">
                  {w.art}
                  <h3 className="mt-5 text-section font-bold">{w.title}</h3>
                  <ol className="mt-4 flex flex-col">
                    {w.steps.map((s, k) => (
                      <li key={s} className="flex gap-4 border-t border-line py-2.5 text-ui text-charcoal">
                        <span className="w-5 shrink-0 font-mono text-micro leading-[1.6rem] text-mute">0{k + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section aria-labelledby="who-title">
          <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
            <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="eyebrow">Who it’s for</p>
                <h2 id="who-title" className="mt-3 text-display font-extrabold">
                  An ecosystem, not a single audience.
                </h2>
              </div>
              <Link href="/about" className="group inline-flex items-center gap-1.5 text-ui font-medium text-ink">
                About {brand.productName} <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Reveal>
            <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {AUDIENCES.map((a, i) => (
                <Reveal as="li" key={a.title} delay={(i % 3) * 0.06} className="flex gap-5 bg-paper p-6 md:p-7">
                  <div className="shrink-0">{a.art}</div>
                  <div>
                    <h3 className="text-section font-bold">{a.title}</h3>
                    <p className="mt-1.5 text-meta leading-relaxed text-sub">{a.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section aria-labelledby="cta-title" className="px-4 pb-20 md:px-8 md:pb-28">
          <Reveal className="on-ink relative mx-auto max-w-[1200px] overflow-hidden rounded-xl bg-ink px-6 py-14 text-white md:px-14 md:py-20">
            <div aria-hidden className="absolute -right-4 top-1/2 hidden -translate-y-1/2 md:block">
              <SparkArt size={240} className="!text-white/70" />
            </div>
            <div className="relative max-w-xl">
              <p className="text-meta text-white/60">Start where you are</p>
              <h2 id="cta-title" className="mt-3 text-display font-extrabold text-white">
                Bring a problem. Leave with a plan and people to build it with.
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={signedIn ? "/home" : "/register"} variant="accent" size="lg">
                  {signedIn ? "Open your workspace" : "Create your account"}
                </ButtonLink>
                <ButtonLink href="/about" size="lg" className="border border-white/25 bg-transparent text-white hover:bg-white/10">
                  Learn about {brand.productName}
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
