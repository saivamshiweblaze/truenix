import { brand } from "@/config/brand";
import { Logo } from "@/components/shell/logo";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { ConstellationArt } from "@/components/illustrations/art";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Logo showSignature />
        <main id="main" className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        <p className="text-micro text-mute">
          Demonstration build. Accounts are stored only in this browser. {brand.parentCompany}.
        </p>
      </div>
      <aside aria-hidden className="relative hidden flex-col justify-between overflow-hidden bg-surface px-14 py-12 lg:flex">
        <div className="hatch absolute inset-0 opacity-40" />
        <div className="relative">
          <p className="max-w-sm text-[1.375rem] font-medium leading-snug tracking-tight text-ink">
            From a problem you noticed to a venture you can defend — one place to find it, test it and build it with others.
          </p>
        </div>
        <ConstellationArt className="relative mx-auto w-full max-w-md" />
        <JourneyLine current={0} className="relative" />
      </aside>
    </div>
  );
}
