import { ApiError, request } from "@/lib/http";

export type AuthErrorCode = "invalidCredentials" | "emailTaken" | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

/** Google 로그인은 fetch가 아니라 전체 페이지 이동으로 시작합니다. */
export const GOOGLE_LOGIN_URL = "/api/auth/google";

// 401/409는 이 화면에서 정상적으로 일어나는 결과라서 로그인 화면으로 튕기지 않게 합니다.
const AUTH_REQUEST = { method: "POST", redirectOnUnauthorized: false } as const;

function toAuthError(error: unknown, known: Record<number, AuthErrorCode>) {
  if (error instanceof ApiError && known[error.status]) {
    return new AuthError(known[error.status]);
  }
  return new AuthError("unknown");
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<void> {
  try {
    await request("/auth/login", { ...AUTH_REQUEST, body: input });
  } catch (error) {
    throw toAuthError(error, { 401: "invalidCredentials" });
  }
}

export async function signup(input: {
  name?: string;
  email: string;
  password: string;
}): Promise<void> {
  // 이름은 선택이라 비어 있으면 아예 보내지 않습니다. (빈 문자열이 그대로 저장되지 않게)
  const { name, ...rest } = input;
  try {
    await request("/auth/register", {
      ...AUTH_REQUEST,
      body: name ? { ...rest, name } : rest,
    });
  } catch (error) {
    throw toAuthError(error, { 409: "emailTaken" });
  }
}

export async function logout(): Promise<void> {
  await request("/auth/logout", AUTH_REQUEST);
}
