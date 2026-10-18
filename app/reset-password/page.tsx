import type { Metadata } from "next";

import { ResetPasswordClient } from "@/components/page/ResetPassword";

export const metadata: Metadata = {
  title: "비밀번호 재설정 · 여행길",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
