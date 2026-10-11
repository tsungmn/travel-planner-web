"use client";

import { ErrorFallback } from "@/components/common/ErrorFallback";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback onRetry={reset} />;
}
