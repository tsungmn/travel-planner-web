import { cookies } from "next/headers";

// next.config.ts의 rewrites 대상과 같은 값을 씁니다.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";
const SESSION_COOKIE = "sid";

/**
 * 서버 컴포넌트에서 로그인 상태를 확인합니다.
 *
 * - 세션 쿠키가 없거나 백엔드가 401이면 `false`
 * - 백엔드에 닿지 못하거나 5xx이면 예외를 던져 app/error.tsx가 처리합니다.
 *   (서버 장애를 "로그아웃 상태"로 오해해 로그인 화면으로 보내지 않기 위해서입니다.)
 */
export async function hasValidSession(): Promise<boolean> {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sid) return false;

  const response = await fetch(`${API_ORIGIN}/api/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE}=${sid}` },
    cache: "no-store",
  });
  if (response.status === 401) return false;
  if (!response.ok) {
    throw new Error(`GET /api/auth/me 실패: ${response.status}`);
  }
  return true;
}
