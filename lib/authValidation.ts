export type AuthMode = "login" | "signup";
export type AuthField = "name" | "email" | "password";

/** 문구가 아니라 코드를 반환합니다. 문구는 화면(i18n)에서 정합니다. */
export type AuthFieldError =
  | "nameTooLong"
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordLength";
export type AuthFieldErrors = Partial<Record<AuthField, AuthFieldError>>;

/** 재설정/단독 입력란에서 쓰는 별도의 코드 모음입니다. */
export type ResetFieldError =
  "emailRequired" | "emailInvalid" | "passwordRequired" | "passwordLength";

export const AUTH_NAME_MAX_LENGTH = 50;
export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuth(input: {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();

  if (
    input.mode === "signup" &&
    input.name.trim().length > AUTH_NAME_MAX_LENGTH
  ) {
    errors.name = "nameTooLong";
  }
  if (!email) {
    errors.email = "emailRequired";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "emailInvalid";
  }
  if (!input.password) {
    errors.password = "passwordRequired";
  } else if (
    input.password.length < AUTH_PASSWORD_MIN_LENGTH ||
    input.password.length > AUTH_PASSWORD_MAX_LENGTH
  ) {
    errors.password = "passwordLength";
  }

  return errors;
}

/** 단일 이메일 입력란 검증. 인증 메일 재전송/비밀번호 재설정 요청에 씁니다. */
export function validateEmailField(email: string): ResetFieldError | null {
  const value = email.trim();
  if (!value) return "emailRequired";
  if (!EMAIL_PATTERN.test(value)) return "emailInvalid";
  return null;
}

/** 재설정용 비밀번호 단일 입력란 검증. AUTH_PASSWORD_* 상수를 재사용합니다. */
export function validatePasswordField(
  password: string,
): ResetFieldError | null {
  if (!password) return "passwordRequired";
  if (
    password.length < AUTH_PASSWORD_MIN_LENGTH ||
    password.length > AUTH_PASSWORD_MAX_LENGTH
  ) {
    return "passwordLength";
  }
  return null;
}
