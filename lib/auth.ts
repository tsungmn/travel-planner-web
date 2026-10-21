import { ApiError, request } from "@/lib/http";
import { getTurnstileToken } from "@/lib/turnstile";

export type AuthErrorCode =
  | "invalidCredentials"
  | "emailTaken"
  | "emailNotVerified"
  | "tooManyAttempts"
  | "invalidToken"
  | "captchaFailed"
  | "network"
  | "unknown";

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

function toAuthError(
  error: unknown,
  known: Record<number, AuthErrorCode>,
): AuthError {
  if (error instanceof ApiError) {
    if (error.code === "network_error") return new AuthError("network");
    if (known[error.status]) return new AuthError(known[error.status]);
  }
  return new AuthError("unknown");
}

/**
 * 봇 방지가 켜진 요청(가입, 비밀번호 찾기, 인증 메일 재전송)의 본문에 Turnstile 토큰을 붙입니다.
 * 사이트 키가 없으면 그대로 돌려줍니다.
 */
async function withCaptcha<B extends object>(body: B): Promise<B> {
  try {
    const token = await getTurnstileToken();
    return token ? { ...body, turnstile_token: token } : body;
  } catch {
    throw new AuthError("captchaFailed");
  }
}

async function callAuth<T>(
  path: string,
  body: unknown,
  known: Record<number, AuthErrorCode>,
): Promise<T> {
  try {
    return await request<T>(path, { ...AUTH_REQUEST, body });
  } catch (error) {
    throw toAuthError(error, known);
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<void> {
  await callAuth("/auth/login", input, {
    401: "invalidCredentials",
    403: "emailNotVerified",
    429: "tooManyAttempts",
  });
}

export async function signup(input: {
  name?: string;
  email: string;
  password: string;
}): Promise<{ email: string }> {
  // 이름은 선택이라 비어 있으면 아예 보내지 않습니다. (빈 문자열이 그대로 저장되지 않게)
  const { name, ...rest } = input;
  const body = await withCaptcha(name ? { ...rest, name } : rest);
  const result = await callAuth<{ email: string } | void>(
    "/auth/register",
    body,
    { 400: "captchaFailed", 409: "emailTaken", 429: "tooManyAttempts" },
  );
  // 201 응답 본문이 없는 환경도 고려해 이메일을 폼 값으로 채웁니다.
  return { email: input.email, ...(result ?? {}) };
}

export async function verifyEmail(token: string): Promise<void> {
  await callAuth(
    "/auth/verify-email",
    { token },
    {
      400: "invalidToken",
      429: "tooManyAttempts",
    },
  );
}

export async function resendVerification(email: string): Promise<void> {
  await callAuth("/auth/resend-verification", await withCaptcha({ email }), {
    400: "captchaFailed",
    429: "tooManyAttempts",
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await callAuth("/auth/forgot-password", await withCaptcha({ email }), {
    400: "captchaFailed",
    429: "tooManyAttempts",
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  await callAuth("/auth/reset-password", input, {
    400: "invalidToken",
    429: "tooManyAttempts",
  });
}

export async function logout(): Promise<void> {
  await request("/auth/logout", AUTH_REQUEST);
}

const DELETE_REQUEST = {
  method: "DELETE",
  redirectOnUnauthorized: false,
} as const;

export type DeleteReason =
  | "not_useful"
  | "privacy_concern"
  | "too_difficult"
  | "found_alternative"
  | "other";

export async function deleteAccount(input: {
  reason: DeleteReason;
  detail?: string;
}): Promise<void> {
  await request("/auth/me", {
    ...DELETE_REQUEST,
    body: input,
  });
}
