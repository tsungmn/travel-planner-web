import { TripDetailClient } from "@/components/page/TripDetail";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TripDetailClient id={id} />;
}
