import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { PublicFooter, PublicHeader } from "@/components/shell/public-chrome";
import { WeblazeAttribution } from "@/components/shell/logo";
import { CmsText } from "@/components/shell/cms-text";
import { BuildArt, BulbArt, CollabArt, CompassArt, FlaskArt, FounderArt, LensArt, NetworkArt } from "@/components/illustrations/art";

export const metadata: Metadata = {
  title: "About",
  description: `What ${brand.productName} is, who it serves, and how discovery, research, validation and collaboration work together. ${brand.signature}.`,
};

const USES = [
  {
    who: "Students",
    art: <BulbArt size={48} />,
    body: "Explore problems in industries they care about, join projects that need their skills, and build a profile grounded in real work rather than a list of claims.",
  },
  {
    who: "Founders",
    art: <FounderArt size={48} />,
    body: "Research a market, test assumptions with labelled evidence, find collaborators and reviewers, and track programmes that fit their stage.",
  },
  {
    who: "Professionals, experts and mentors",
    art: <CollabArt size={48} />,
    body: "Review ideas in their domain, mentor early teams, take part in research, and discover ventures worth contributing to.",
  },
  {
    who: "Institutions",
    art: <NetworkArt size={48} />,
    body: "Run innovation programmes, publish opportunities and follow the progress of the projects their students start.",
  },
];

const LOOP = [
  { title: "Discovery", body: "Problems, projects and people surface in one feed, filtered by the industries you follow.", art: <CompassArt size={40} /> },
  { title: "Research", body: "Questions become structured reports that attach to ideas instead of living in scattered documents.", art: <LensArt size={40} /> },
  { title: "Validation", body: "Assumptions are tested area by area, and every piece of evidence keeps its type and source.", art: <FlaskArt size={40} /> },
  { title: "Collaboration", body: "The people who research, review and build an idea stay connected to it as it moves forward.", art: <BuildArt size={40} /> },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <PublicHeader />
      <main id="main">
        <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">About {brand.productName}</p>
            <h1 className="mt-4 text-hero font-extrabold">A place where startup ideas are found, tested and built.</h1>
            <p className="mt-7 text-[1.0625rem] font-medium text-ink">
              {brand.productName} — <WeblazeAttribution />.
            </p>
            <CmsText id="about-intro" field="lead" className="mt-4 max-w-2xl text-body text-sub" />
          </Reveal>
        </section>

        <section aria-labelledby="what" className="border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-[220px_minmax(0,1fr)] md:px-8 md:py-20">
            <h2 id="what" className="eyebrow !text-sub">
              What it is
            </h2>
            <Reveal className="max-w-2xl text-body text-charcoal [&>p+p]:mt-4">
              <p className="text-[1.125rem] leading-relaxed text-ink">
                {brand.productName} is an integrated startup discovery, research, validation and innovation ecosystem. It gives people who want to start something — and the people who help them — one shared workspace for the whole early journey.
              </p>
              <p>Instead of a feed in one tool, research in another and evidence in a spreadsheet, ideas, reports, validation work, collaborators and opportunities live together and stay linked.</p>
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="problem" className="border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-[220px_minmax(0,1fr)] md:px-8 md:py-20">
            <h2 id="problem" className="eyebrow !text-sub">
              The problem it addresses
            </h2>
            <Reveal className="grid max-w-3xl gap-6 sm:grid-cols-3">
              {[
                ["Ideas start without evidence", "Early ideas are often judged on enthusiasm. Guesses, analysis and real customer responses get mixed together."],
                ["Talent and problems rarely meet", "Students with skills and founders with problems seldom find each other at the right moment."],
                ["Support is fragmented", "Programmes, mentors and research live in different places, so the next step is hard to see."],
              ].map(([t, b]) => (
                <div key={t} className="border-t-2 border-ink pt-4">
                  <h3 className="text-ui font-bold">{t}</h3>
                  <p className="mt-2 text-meta leading-relaxed text-sub">{b}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="who" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
            <Reveal className="max-w-2xl">
              <h2 id="who" className="text-display font-extrabold">
                Who it serves, and how they use it
              </h2>
            </Reveal>
            <ul className="mt-12 grid gap-4 md:grid-cols-2">
              {USES.map((u, i) => (
                <Reveal as="li" key={u.who} delay={(i % 2) * 0.08} className="flex gap-5 rounded-lg border border-line bg-paper p-6 transition-shadow duration-300 hover:shadow-lift">
                  <div className="shrink-0">{u.art}</div>
                  <div>
                    <h3 className="text-section font-bold">{u.who}</h3>
                    <p className="mt-2 text-ui leading-relaxed text-sub">{u.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="loop" className="border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
            <Reveal className="max-w-2xl">
              <h2 id="loop" className="text-display font-extrabold">
                How the pieces work together
              </h2>
              <p className="mt-4 text-body text-sub">Discovery feeds research, research feeds validation, and validation shows which collaborators and programmes an idea needs next.</p>
            </Reveal>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {LOOP.map((l, i) => (
                <Reveal as="li" key={l.title} delay={i * 0.07}>
                  <div className="flex items-center gap-3">
                    {l.art}
                    <span className="font-mono text-micro text-mute">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-section font-bold">{l.title}</h3>
                  <p className="mt-2 text-meta leading-relaxed text-sub">{l.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="vision" className="border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-[220px_minmax(0,1fr)] md:px-8 md:py-20">
            <h2 id="vision" className="eyebrow !text-sub">
              The broader vision
            </h2>
            <Reveal className="max-w-2xl text-body text-charcoal [&>p+p]:mt-4">
              <p className="text-[1.125rem] leading-relaxed text-ink">
                We want the distance between noticing a problem and doing something credible about it to be much shorter — for anyone, not only for people who already know founders, investors or researchers.
              </p>
              <p>
                That means connecting students, founders, professionals, mentors, research participants and institutions around shared, evidence-based work, and making the next step visible at every stage.
              </p>
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="company" className="border-t border-line bg-surface">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-16 md:flex-row md:items-end md:justify-between md:px-8 md:py-20">
            <div className="max-w-2xl">
              <h2 id="company" className="eyebrow !text-sub">
                The company behind it
              </h2>
              <p className="mt-4 text-[1.125rem] leading-relaxed text-ink">
                {brand.productName} is designed, built and operated by <WeblazeAttribution prefix="" />, a technology company. {brand.productName} is the product; Weblaze Technologies is the team that builds it.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="accent" size="lg">
                Create your account
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" size="lg">
                Back to home
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
