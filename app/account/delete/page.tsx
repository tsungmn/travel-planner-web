import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { hasValidSession } from "@/lib/serverAuth";
import { AccountDeleteClient } from "@/components/page/AccountDelete";

export const metadata: Metadata = {
  title: "계정 삭제 · 여행길",
};

export default async function AccountDeletePage() {
  if (!(await hasValidSession())) redirect("/login");
  return <AccountDeleteClient />;
}
