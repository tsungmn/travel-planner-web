import type { Metadata } from "next";

import { TermsOfService } from "@/components/page/TermsOfService";

export const metadata: Metadata = {
  title: "이용약관 · 여행길",
};

export default function TermsPage() {
  return <TermsOfService />;
}
