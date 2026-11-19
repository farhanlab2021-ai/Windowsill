import { Suspense } from "react";
import { Workspace, WorkspaceSkeleton } from "@/components/workspace/Workspace";

/**
 * The notes workspace. All data lives in the browser, so this page is a
 * static shell that the client fills in. The open page is in the URL as
 * `/?page=<id>`; reading the URL needs a <Suspense> boundary.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Workspace />
    </Suspense>
  );
}
