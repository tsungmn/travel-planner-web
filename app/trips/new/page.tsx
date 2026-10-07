import type { Metadata } from "next";
import { TripNewClient } from "@/components/page/TripNew";

export const metadata: Metadata = {
  title: "새 여행 만들기 | 여행길",
};

export default function TripNewPage() {
  return <TripNewClient />;
}
