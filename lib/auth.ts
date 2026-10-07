export type AuthErrorCode = "invalidCredentials" | "emailTaken" | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TODO: 실제 로그인/회원가입 API로 교체하세요. 실패하면 AuthError를 던지면 됩니다.
// 아래는 화면 확인용 데모입니다. (비밀번호 "wrongpass" → 로그인 실패,
// 이메일 "taken@example.com" → 가입 실패)

export async function login(input: {
  email: string;
  password: string;
}): Promise<void> {
  await delay(600);
  if (input.password === "wrongpass") throw new AuthError("invalidCredentials");
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  await delay(600);
  if (input.email === "taken@example.com") throw new AuthError("emailTaken");
}
