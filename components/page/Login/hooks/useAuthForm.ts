import { SubmitEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AuthError,
  GOOGLE_LOGIN_URL,
  login,
  signup,
  type AuthErrorCode,
} from "@/lib/auth";
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
  // 가입 성공 또는 미인증 403 알릿의 재전송 버튼 눌렀을 때 전환되는 "메일을 보냈어요" 화면.
  // null이면 폼, 문자열이면 해당 이메일 주소의 확인 안내 화면을 보여 줍니다.
  const [verifySentEmail, setVerifySentEmail] = useState<string | null>(null);

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
    setVerifySentEmail(null);
  }

  function changeField(field: AuthField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setErrorCode(null);
  }

  // 미인증 403 알릿의 "인증 메일 다시 보내기" 인라인 버튼에서 폼을 바꿉니다.
  function showVerifySent() {
    setVerifySentEmail(values.email.trim());
    setErrorCode(null);
  }

  function backToForm() {
    setVerifySentEmail(null);
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
        router.push(nextPath);
      } else {
        // 가입은 쿠키를 발급하지 않고, 같은 자리에서 "메일을 보냈어요" 화면으로 바꿉니다.
        await signup({
          name: values.name.trim(),
          email,
          password: values.password,
        });
        setVerifySentEmail(email);
      }
    } catch (error) {
      setErrorCode(error instanceof AuthError ? error.code : "unknown");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleGoogle() {
    if (submittingRef.current) return;
    // OAuth 상태 쿠키를 받아야 하므로 router.push가 아니라 전체 페이지 이동을 씁니다.
    window.location.assign(GOOGLE_LOGIN_URL);
  }

  return {
    mode,
    values,
    fieldErrors,
    errorCode,
    googleFailed,
    showPassword,
    submitting,
    verifySentEmail,
    changeMode,
    changeField,
    setShowPassword,
    handleSubmit,
    handleGoogle,
    showVerifySent,
    backToForm,
  };
}
