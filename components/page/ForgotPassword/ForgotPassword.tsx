"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Anchor, Button, Stack, Text, TextInput } from "@mantine/core";
import { IconKey, IconMailFast } from "@tabler/icons-react";

import { forgotPassword } from "@/lib/auth";
import { validateEmailField, type ResetFieldError } from "@/lib/authValidation";
import { AuthLayout } from "@/components/common/AuthLayout";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import classes from "./ForgotPassword.module.css";

export function ForgotPasswordClient() {
  const submittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<ResetFieldError | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const cooldown = useResendCooldown(forgotPassword);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const err = validateEmailField(email);
    setFieldError(err);
    if (err) return;

    submittingRef.current = true;
    // 실제로 요청이 성공했을 때만 "보냈어요" 화면으로 넘어갑니다.
    const ok = await cooldown.send(email.trim());
    submittingRef.current = false;
    if (ok) setSubmitted(true);
  }

  return (
    <AuthLayout ariaLabel="비밀번호 재설정">
      {submitted ? (
        <Stack align="center" gap="md" className={classes.sent}>
          <div className={classes.iconWrap}>
            <IconMailFast size={48} aria-hidden="true" />
          </div>
          <h2 className={classes.title}>재설정 링크를 보냈어요</h2>
          <Text className={classes.description}>
            가입된 이메일이라면 재설정 링크를 보냈어요. 메일함과 스팸함을 확인해
            주세요.
          </Text>
          {cooldown.status === "rate-limited" && (
            <Text className={classes.notice} c="red" role="alert">
              잠시 후 다시 시도해 주세요.
            </Text>
          )}
          {cooldown.status === "error" && (
            <Text className={classes.notice} c="red" role="alert">
              문제가 생겼어요. 잠시 후 다시 시도해 주세요.
            </Text>
          )}
          <Button
            type="button"
            fullWidth
            onClick={() => {
              void cooldown.send(email.trim());
            }}
            disabled={cooldown.sending || cooldown.secondsLeft > 0}
            loading={cooldown.sending}
            aria-busy={cooldown.sending}
            className={classes.primaryButton}
          >
            {cooldown.secondsLeft > 0
              ? `${cooldown.secondsLeft}초 후에 다시 보낼 수 있어요`
              : "재설정 링크 다시 받기"}
          </Button>
        </Stack>
      ) : (
        <Stack gap="md" className={classes.form}>
          <div className={classes.heading}>
            <div className={classes.iconWrap}>
              <IconKey size={36} aria-hidden="true" />
            </div>
            <h2 className={classes.title}>비밀번호 재설정</h2>
            <Text className={classes.description}>
              가입한 이메일을 입력하면 재설정 링크를 보내드려요.
            </Text>
          </div>
          <form onSubmit={handleSubmit} noValidate aria-busy={cooldown.sending}>
            <Stack gap="md">
              <TextInput
                id="forgot-email"
                name="email"
                type="email"
                label="이메일"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                disabled={cooldown.sending}
                error={
                  fieldError === "emailRequired"
                    ? "이메일을 입력해 주세요."
                    : fieldError === "emailInvalid"
                      ? "올바른 이메일 형식이 아니에요."
                      : undefined
                }
                onChange={(e) => {
                  setEmail(e.currentTarget.value);
                  setFieldError(null);
                }}
                classNames={{ input: classes.input, label: classes.label }}
              />
              {cooldown.status === "rate-limited" && (
                <Text className={classes.notice} c="red" role="alert">
                  잠시 후 다시 시도해 주세요.
                </Text>
              )}
              {cooldown.status === "error" && (
                <Text className={classes.notice} c="red" role="alert">
                  문제가 생겼어요. 잠시 후 다시 시도해 주세요.
                </Text>
              )}
              <Button
                type="submit"
                fullWidth
                loading={cooldown.sending}
                disabled={cooldown.sending}
                className={classes.primaryButton}
              >
                재설정 링크 받기
              </Button>
              <Anchor component={Link} href="/login" size="sm" ta="center">
                로그인으로 돌아가기
              </Anchor>
            </Stack>
          </form>
        </Stack>
      )}
    </AuthLayout>
  );
}
