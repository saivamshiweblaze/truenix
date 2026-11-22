import Link from "next/link";
import { brand } from "@/config/brand";
import { Logo, WeblazeAttribution } from "@/components/shell/logo";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { BulbArt, CollabArt, ConstellationArt, LensArt } from "@/components/illustrations/art";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Logo showSignature />
        <main id="main" className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-mute">
          <WeblazeAttribution prefix={`${brand.productName} is a product of`} linkClassName="font-normal text-sub" />
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </p>
      </div>
      <aside aria-hidden className="relative hidden flex-col justify-between overflow-hidden bg-surface px-14 py-12 lg:flex">
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative">
          <p className="text-meta font-medium text-sub">{brand.productName}</p>
          <p className="mt-3 max-w-sm font-display text-[1.5rem] font-bold leading-snug tracking-tight text-ink">
            From a problem you noticed to a venture you can defend — find it, test it and build it with others.
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <ConstellationArt className="w-full" />
          <div className="absolute -top-6 left-0 rounded-lg border border-line bg-paper p-2 shadow-card">
            <BulbArt size={64} />
          </div>
          <div className="absolute bottom-2 left-1/3 rounded-lg border border-line bg-paper p-2 shadow-card">
            <LensArt size={64} />
          </div>
          <div className="absolute -right-2 top-2 rounded-lg border border-line bg-paper p-2 shadow-card">
            <CollabArt size={64} />
          </div>
        </div>
        <JourneyLine current={0} className="relative" />
      </aside>
    </div>
  );
}
