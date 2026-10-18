"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, PasswordInput, Stack, Text } from "@mantine/core";
import {
  IconCircleCheck,
  IconExclamationCircle,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";

import { AuthError, resetPassword } from "@/lib/auth";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  validatePasswordField,
  type ResetFieldError,
} from "@/lib/authValidation";
import classes from "./ResetPassword.module.css";

type Status = "form" | "success" | "invalid" | "network";

export function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittingRef = useRef(false);
  // 토큰은 최초 렌더의 URL에서 한 번만 읽어 보관합니다. 이후 주소창에서
  // token 쿼리를 지워도 제출에 쓸 수 있게 하기 위해서입니다.
  const [token] = useState(() => searchParams?.get("token") ?? "");

  // 주소창에서 token 쿼리를 지웁니다. (Referer/히스토리 유출 방지)
  useEffect(() => {
    if (searchParams?.get("token")) router.replace("/reset-password");
  }, [router, searchParams]);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<ResetFieldError | null>(null);
  // 토큰 없이 들어오면 처음부터 "링크가 올바르지 않아요"를 보여 줍니다.
  const [status, setStatus] = useState<Status>(token ? "form" : "invalid");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const err = validatePasswordField(password);
    setFieldError(err);
    if (err) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setStatus("success");
    } catch (error) {
      // invalidToken만 "만료"로 보여 주고, 나머지(429, 500, 네트워크)는 다시 시도하게 합니다.
      setStatus(
        error instanceof AuthError && error.code === "invalidToken"
          ? "invalid"
          : "network",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (status === "success") {
    return (
      <StateBlock
        icon={<IconCircleCheck size={48} aria-hidden="true" />}
        title="비밀번호를 바꿨어요"
        tone="success"
      >
        <Button
          type="button"
          fullWidth
          className={classes.primaryButton}
          onClick={() => router.push("/login")}
        >
          로그인하러 가기
        </Button>
      </StateBlock>
    );
  }

  if (status === "invalid") {
    return (
      <StateBlock
        icon={<IconExclamationCircle size={48} aria-hidden="true" />}
        title={token ? "링크가 만료됐어요" : "링크가 올바르지 않아요"}
        tone="error"
      >
        <Text className={classes.hint}>
          {token
            ? "재설정 링크가 만료됐거나 이미 사용됐어요. 새 링크를 받아 다시 시도해 주세요."
            : "메일의 링크를 다시 눌러 주세요. 안 되면 새 링크를 받아 주세요."}
        </Text>
        <Link href="/forgot-password" className={classes.link}>
          재설정 링크 다시 받기
        </Link>
      </StateBlock>
    );
  }

  if (status === "network") {
    return (
      <StateBlock
        icon={<IconExclamationCircle size={48} aria-hidden="true" />}
        title="문제가 생겼어요"
        tone="error"
      >
        <Text className={classes.hint}>잠시 후 다시 시도해 주세요.</Text>
        <Button
          type="button"
          fullWidth
          className={classes.primaryButton}
          onClick={() => setStatus("form")}
        >
          다시 시도
        </Button>
      </StateBlock>
    );
  }

  return (
    <Stack gap="md" className={classes.form}>
      <div className={classes.heading}>
        <h2 className={classes.title}>새 비밀번호 설정</h2>
        <Text className={classes.hint}>
          {AUTH_PASSWORD_MIN_LENGTH}~{AUTH_PASSWORD_MAX_LENGTH}자의 새
          비밀번호를 입력해 주세요.
        </Text>
      </div>
      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <Stack gap="md">
          <PasswordInput
            id="new-password"
            name="password"
            label="새 비밀번호"
            placeholder={`${AUTH_PASSWORD_MIN_LENGTH}자 이상 입력해 주세요`}
            autoComplete="new-password"
            required
            value={password}
            disabled={submitting}
            error={
              fieldError === "passwordRequired"
                ? "비밀번호를 입력해 주세요."
                : fieldError === "passwordLength"
                  ? `비밀번호는 ${AUTH_PASSWORD_MIN_LENGTH}~${AUTH_PASSWORD_MAX_LENGTH}자여야 해요.`
                  : undefined
            }
            visible={showPassword}
            onVisibilityChange={setShowPassword}
            visibilityToggleIcon={({ reveal }) =>
              reveal ? (
                <IconEyeOff size={20} aria-hidden="true" />
              ) : (
                <IconEye size={20} aria-hidden="true" />
              )
            }
            visibilityToggleButtonProps={{
              "aria-label": showPassword ? "비밀번호 숨기기" : "비밀번호 보기",
              "aria-pressed": showPassword,
            }}
            onChange={(e) => {
              setPassword(e.currentTarget.value);
              setFieldError(null);
            }}
            classNames={{
              input: classes.input,
              label: classes.label,
              innerInput: classes.passwordInner,
              section: classes.passwordSection,
              visibilityToggle: classes.visibilityToggle,
            }}
          />
          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={submitting}
            className={classes.primaryButton}
          >
            비밀번호 바꾸기
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}

function StateBlock({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "success" | "error";
  children?: React.ReactNode;
}) {
  return (
    <Box className={classes.state} data-tone={tone}>
      <Box className={classes.iconWrap} data-tone={tone}>
        {icon}
      </Box>
      <h2 className={classes.title}>{title}</h2>
      {children}
    </Box>
  );
}
