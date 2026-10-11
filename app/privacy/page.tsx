import type { Metadata } from "next";

import { PrivacyPolicy } from "@/components/page/PrivacyPolicy";

export const metadata: Metadata = {
  title: "개인정보처리방침 · 여행길",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
