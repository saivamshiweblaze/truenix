import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/primitives";
import { SearchResults } from "@/features/search/search-results";

export default function SearchPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchResults />
    </Suspense>
  );
}
