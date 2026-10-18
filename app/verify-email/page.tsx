import type { Metadata } from "next";

import { VerifyEmailClient } from "@/components/page/VerifyEmail";

export const metadata: Metadata = {
  title: "이메일 인증 · 여행길",
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
