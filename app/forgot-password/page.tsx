import type { Metadata } from "next";

import { ForgotPasswordClient } from "@/components/page/ForgotPassword";

export const metadata: Metadata = {
  title: "비밀번호 재설정 링크 받기 · 여행길",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
