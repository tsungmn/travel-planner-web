import { redirect } from "next/navigation";

import { LoginClient } from "@/components/page/Login";
import { getNextPath } from "@/lib/navigation";
import { hasValidSession } from "@/lib/serverAuth";

async function isLoggedIn(): Promise<boolean> {
  try {
    return await hasValidSession();
  } catch {
    // 백엔드에 닿지 못해도 로그인 화면은 보여 줍니다. (오류 화면으로 막지 않습니다)
    return false;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  if (await isLoggedIn()) {
    const { next } = await searchParams;
    const path = getNextPath(typeof next === "string" ? next : null);
    // `/login`이나 `/`로 돌려보내면 다시 이 화면으로 돌아와 반복되므로 목록으로 보냅니다.
    const loops = path === "/" || path.startsWith("/login");
    redirect(loops ? "/trips" : path);
  }

  return <LoginClient />;
}
