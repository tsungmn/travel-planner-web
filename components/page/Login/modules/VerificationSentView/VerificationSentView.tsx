"use client";

import { IconMailFast } from "@tabler/icons-react";
import { Box, Button, Text } from "@mantine/core";

import type { useResendCooldown } from "@/hooks/useResendCooldown";
import classes from "./VerificationSentView.module.css";

type VerificationSentViewProps = {
  email: string;
  cooldown: ReturnType<typeof useResendCooldown>;
  onBackToForm: () => void;
};

export function VerificationSentView({
  email,
  cooldown,
  onBackToForm,
}: VerificationSentViewProps) {
  const { secondsLeft, sending, status, send } = cooldown;
  const blocked = secondsLeft > 0 || sending;

  return (
    <Box className={classes.wrap} role="status" aria-live="polite">
      <Box className={classes.iconWrap}>
        <IconMailFast size={48} aria-hidden="true" />
      </Box>
      <h2 className={classes.title}>확인 메일을 보냈어요</h2>
      <Text className={classes.email}>{email}</Text>
      <Text className={classes.description}>
        메일의 링크를 누르면 가입이 끝나요. 안 보이면 스팸함도 확인해 주세요.
      </Text>

      {status === "sent" && (
        <Text className={classes.notice} role="status">
          다시 보냈어요. 메일함을 확인해 주세요.
        </Text>
      )}
      {status === "rate-limited" && (
        <Text className={classes.notice} c="red" role="alert">
          잠시 후 다시 시도해 주세요.
        </Text>
      )}
      {status === "error" && (
        <Text className={classes.notice} c="red" role="alert">
          문제가 생겼어요. 잠시 후 다시 시도해 주세요.
        </Text>
      )}

      <Button
        type="button"
        fullWidth
        onClick={() => void send(email)}
        disabled={blocked}
        loading={sending}
        aria-busy={sending}
        className={classes.resendButton}
      >
        {secondsLeft > 0
          ? `${secondsLeft}초 후에 다시 보낼 수 있어요`
          : "인증 메일 다시 보내기"}
      </Button>

      <button
        type="button"
        className={classes.textButton}
        onClick={onBackToForm}
      >
        다른 이메일 사용하기
      </button>
    </Box>
  );
}
