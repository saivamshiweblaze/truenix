"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { BlueprintArt, BulbArt, CompassArt, FlaskArt, LensArt, NetworkArt } from "@/components/illustrations/art";
import { useAppSnapshot } from "@/lib/store/store";

const JOURNEYS = [
  {
    title: "You have an idea",
    art: <BulbArt size={56} />,
    steps: ["Submit it privately or publicly", "Research the market and competitors", "Test assumptions with real evidence", "Get expert feedback and find collaborators", "Find incubation and funding programmes"],
    cta: { href: "/register", label: "Start with your idea" },
  },
  {
    title: "You are still looking",
    art: <CompassArt size={56} />,
    steps: ["Read problems people face in sixteen industries", "Follow founders and the projects they are building", "Learn which technologies are changing what", "Contribute your skills to someone else's project", "Let an idea find you"],
    cta: { href: "/register", label: "Start exploring" },
  },
];

const MODULES = [
  { art: <CompassArt size={40} />, title: "Discover", body: "A feed of problems, projects, research findings and founder updates across industries." },
  { art: <LensArt size={40} />, title: "AI Researcher", body: "Structured research reports on markets, competitors and customers, linked to your ideas." },
  { art: <FlaskArt size={40} />, title: "Validate my idea", body: "Twelve validation areas, with AI analysis, public research, expert opinion and customer evidence kept apart." },
  { art: <NetworkArt size={40} />, title: "Community", body: "Founders, students, experts and mentors, with profiles built around skills and collaboration." },
  { art: <BlueprintArt size={40} />, title: "Opportunities", body: "Incubators, accelerators, grants, hackathons and university programmes in one searchable list." },
];

export default function WelcomePage() {
  const { state, hydrated } = useAppSnapshot();
  const signedIn = hydrated && state.signedIn && state.user;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 md:px-8">
        <Logo showSignature />
        <nav aria-label="Account" className="flex items-center gap-2">
          {signedIn ? (
            <ButtonLink href="/home" size="sm">
              Open your workspace
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 text-ui text-sub hover:text-ink">
                Sign in
              </Link>
              <ButtonLink href="/register" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto max-w-[1180px] px-5 pb-20 pt-14 md:px-8 md:pt-24">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.045em] text-ink sm:text-[3.5rem] md:text-[4.5rem]"
          >
            Find a problem worth solving. Prove it. Build it with people who care.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.5 }} className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-sub">
            {brand.description} Whether you arrive with an idea or with nothing but curiosity.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={signedIn ? "/home" : "/register"} variant="accent" size="lg">
              {signedIn ? "Continue to your workspace" : "Create a free demo account"}
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">
              Try a demo persona
            </ButtonLink>
          </motion.div>
          <div className="mt-20 max-w-4xl">
            <JourneyLine current={4} />
          </div>
        </section>

        <section aria-labelledby="journeys" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1180px] px-5 py-16 md:px-8 md:py-24">
            <h2 id="journeys" className="max-w-xl text-title font-semibold">
              Two ways in. Both lead somewhere.
            </h2>
            <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-0">
              {JOURNEYS.map((j, idx) => (
                <div key={j.title} className={idx === 1 ? "md:border-l md:border-line md:pl-12" : "md:pr-12"}>
                  {j.art}
                  <h3 className="mt-5 text-section font-semibold">{j.title}</h3>
                  <ol className="mt-5 flex flex-col">
                    {j.steps.map((s, i) => (
                      <li key={s} className="flex gap-4 border-t border-line py-3 text-ui text-charcoal">
                        <span className="w-4 shrink-0 text-meta text-mute tabular-nums">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <ButtonLink href={j.cta.href} variant="secondary" className="mt-6">
                    {j.cta.label}
                  </ButtonLink>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="inside" className="mx-auto max-w-[1180px] px-5 py-16 md:px-8 md:py-24">
          <h2 id="inside" className="text-title font-semibold">
            What is inside
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m) => (
              <li key={m.title}>
                {m.art}
                <h3 className="mt-4 text-ui font-semibold">{m.title}</h3>
                <p className="mt-1.5 text-meta leading-relaxed text-sub">{m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-8 text-meta text-mute md:flex-row md:justify-between md:px-8">
          <span>{brand.signature}</span>
          <span>
            © {brand.parentCompany}. Demonstration build — all sample content is fictional.
          </span>
        </div>
      </footer>
    </div>
  );
}
