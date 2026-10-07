import { SubmitEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthError, login, signup, type AuthErrorCode } from "@/lib/auth";
import {
  validateAuth,
  type AuthField,
  type AuthFieldErrors,
  type AuthMode,
} from "@/lib/authValidation";
import { getNextPath } from "@/lib/navigation";

const EMPTY_VALUES: Record<AuthField, string> = {
  name: "",
  email: "",
  password: "",
};

/** 로그인/가입 폼의 상태, 검증, 제출을 관리합니다. */
export function useAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittingRef = useRef(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [values, setValues] = useState(EMPTY_VALUES);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const nextPath = getNextPath(searchParams?.get("next") ?? null);
  // Google OAuth 콜백이 ?error=auth 로 돌려보낸 경우
  const googleFailed = searchParams?.get("error") === "auth";

  function changeMode(value: string) {
    if (submittingRef.current || (value !== "login" && value !== "signup"))
      return;
    setMode(value);
    setErrorCode(null);
    setFieldErrors({});
    setShowPassword(false);
  }

  function changeField(field: AuthField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setErrorCode(null);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setErrorCode(null);

    const errors = validateAuth({ mode, ...values });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const email = values.email.trim();
      if (mode === "login") {
        await login({ email, password: values.password });
      } else {
        await signup({
          name: values.name.trim(),
          email,
          password: values.password,
        });
      }
      router.push(nextPath);
    } catch (error) {
      setErrorCode(error instanceof AuthError ? error.code : "unknown");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleGoogle() {
    if (submittingRef.current) return;
    // TODO: 실제 Google OAuth 시작 URL로 교체하세요. 현재는 원본의 이동 동작입니다.
    router.push("/trips");
  }

  return {
    mode,
    values,
    fieldErrors,
    errorCode,
    googleFailed,
    showPassword,
    submitting,
    changeMode,
    changeField,
    setShowPassword,
    handleSubmit,
    handleGoogle,
  };
}
