"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Loader, Stack, Text, TextInput } from "@mantine/core";
import { IconCircleCheck, IconExclamationCircle } from "@tabler/icons-react";

import { AuthError, resendVerification, verifyEmail } from "@/lib/auth";
import { validateEmailField, type ResetFieldError } from "@/lib/authValidation";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import classes from "./VerifyEmail.module.css";

type Status = "loading" | "success" | "invalid" | "network" | "missing";

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calledRef = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<ResetFieldError | null>(null);

  const cooldown = useResendCooldown(resendVerification);

  // 토큰은 최초 렌더의 URL에서 한 번만 읽어 보관합니다. 주소창에서 지운 뒤에도
  // "다시 시도"가 쓸 수 있게 하기 위해서입니다.
  const [token] = useState(() => searchParams?.get("token") ?? "");

  // 주소창에서 token 쿼리를 지웁니다. (Referer/히스토리 유출 방지)
  useEffect(() => {
    if (searchParams?.get("token")) router.replace("/verify-email");
  }, [searchParams, router]);

  // Strict Mode에서 두 번 호출되지 않게 ref로 막습니다.
  // GET이 아니라 POST로 처리하는 이유는 메일 보안 스캐너가 링크를 미리 열어도
  // 인증이 처리되면 안 되기 때문입니다.
  const runVerify = useCallback(async (value: string) => {
    if (!value) {
      setStatus("missing");
      return;
    }
    setStatus("loading");
    try {
      await verifyEmail(value);
      setStatus("success");
    } catch (error) {
      // 링크 자체가 틀린 경우(invalidToken)만 "만료"로 보여 줍니다. 나머지는 다시 시도하게 합니다.
      setStatus(
        error instanceof AuthError && error.code === "invalidToken"
          ? "invalid"
          : "network",
      );
    }
  }, []);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    void runVerify(token);
  }, [runVerify, token]);

  function handleRetry() {
    void runVerify(token);
  }

  function handleResend() {
    const err = validateEmailField(emailInput);
    setEmailError(err);
    if (err) return;
    void cooldown.send(emailInput.trim());
  }

  return (
    <Box className={classes.wrap}>
      {status === "loading" && (
        <StateBlock
          icon={<Loader size={40} aria-hidden="true" />}
          title="이메일을 확인하고 있어요"
          tone="loading"
        />
      )}

      {status === "success" && (
        <StateBlock
          icon={
            <IconCircleCheck
              size={48}
              aria-hidden="true"
              className={classes.successIcon}
            />
          }
          title="이메일 인증이 끝났어요"
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
      )}

      {(status === "invalid" || status === "missing") && (
        <StateBlock
          icon={
            <IconExclamationCircle
              size={48}
              aria-hidden="true"
              className={classes.errorIcon}
            />
          }
          title={
            status === "missing"
              ? "링크가 올바르지 않아요"
              : "링크가 만료됐거나 이미 사용됐어요"
          }
          tone="error"
        >
          <Text className={classes.hint}>
            인증 메일을 다시 보내려면 가입한 이메일을 입력해 주세요.
          </Text>
          <Stack gap="md" align="stretch" w="100%">
            <TextInput
              id="resend-email"
              name="email"
              type="email"
              label="이메일"
              placeholder="you@example.com"
              autoComplete="email"
              value={emailInput}
              disabled={cooldown.sending}
              error={
                emailError === "emailRequired"
                  ? "이메일을 입력해 주세요."
                  : emailError === "emailInvalid"
                    ? "올바른 이메일 형식이 아니에요."
                    : undefined
              }
              onChange={(e) => {
                setEmailInput(e.currentTarget.value);
                setEmailError(null);
              }}
              classNames={{ input: classes.input, label: classes.label }}
            />
            {cooldown.status === "sent" && (
              <Text className={classes.notice} role="status">
                다시 보냈어요. 메일함을 확인해 주세요.
              </Text>
            )}
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
              onClick={handleResend}
              disabled={cooldown.sending || cooldown.secondsLeft > 0}
              loading={cooldown.sending}
              aria-busy={cooldown.sending}
              className={classes.primaryButton}
            >
              {cooldown.secondsLeft > 0
                ? `${cooldown.secondsLeft}초 후에 다시 보낼 수 있어요`
                : "인증 메일 다시 보내기"}
            </Button>
          </Stack>
        </StateBlock>
      )}

      {status === "network" && (
        <StateBlock
          icon={
            <IconExclamationCircle
              size={48}
              aria-hidden="true"
              className={classes.errorIcon}
            />
          }
          title="문제가 생겼어요"
          tone="error"
        >
          <Text className={classes.hint}>잠시 후 다시 시도해 주세요.</Text>
          <Button
            type="button"
            fullWidth
            onClick={handleRetry}
            className={classes.primaryButton}
          >
            다시 시도
          </Button>
        </StateBlock>
      )}
    </Box>
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
  tone: "loading" | "success" | "error";
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
