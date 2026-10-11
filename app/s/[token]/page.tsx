import type { Metadata } from "next";
import { SharedTripClient } from "@/components/page/SharedTrip";

export const metadata: Metadata = {
  title: "공유된 여행 · 여행길",
  robots: { index: false, follow: false },
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <SharedTripClient token={token} />;
}
