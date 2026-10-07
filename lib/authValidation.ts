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
