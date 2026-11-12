import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";
import { PathArt } from "@/components/illustrations/art";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Logo />
      <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-start justify-center gap-4">
        <PathArt size={64} />
        <h1 className="text-title font-semibold">This page does not exist</h1>
        <p className="text-body text-sub">The link may be wrong, or the page may have moved.</p>
        <ButtonLink href="/home">Go to your home page</ButtonLink>
      </main>
    </div>
  );
}
