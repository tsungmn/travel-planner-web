import type { ReactNode } from "react";
import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import type { AuthErrorCode } from "@/lib/auth";
import classes from "./AuthAlerts.module.css";

type AuthAlertsProps = {
  googleFailed: boolean;
  errorCode: AuthErrorCode | null;
  onSwitchToLogin: () => void;
  onResendVerification: () => void;
};

export function AuthAlerts({
  googleFailed,
  errorCode,
  onSwitchToLogin,
  onResendVerification,
}: AuthAlertsProps) {
  return (
    <>
      {googleFailed && (
        <ErrorAlert>Google 로그인에 실패했어요. 다시 시도해 주세요.</ErrorAlert>
      )}

      {errorCode && (
        <ErrorAlert>
          {errorCode === "invalidCredentials" &&
            "이메일 또는 비밀번호가 올바르지 않아요."}
          {errorCode === "emailTaken" && (
            <>
              이미 가입된 이메일이에요.{" "}
              <button
                type="button"
                className={classes.inlineButton}
                onClick={onSwitchToLogin}
              >
                로그인해 보세요.
              </button>
            </>
          )}
          {errorCode === "emailNotVerified" && (
            <>
              이메일 인증이 아직 안 끝났어요. 메일의 링크를 눌러 주세요.{" "}
              <button
                type="button"
                className={classes.inlineButton}
                onClick={onResendVerification}
              >
                인증 메일 다시 보내기
              </button>
            </>
          )}
          {errorCode === "network" &&
            "인터넷 연결을 확인하고 다시 시도해 주세요."}
          {errorCode === "tooManyAttempts" && "잠시 후 다시 시도해 주세요."}
          {errorCode === "unknown" &&
            "문제가 생겼어요. 잠시 후 다시 시도해 주세요."}
        </ErrorAlert>
      )}
    </>
  );
}

function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <Alert
      color="red"
      variant="light"
      radius="lg"
      icon={<IconAlertCircle size={18} aria-hidden="true" />}
      className={classes.alert}
      role="alert"
    >
      {children}
    </Alert>
  );
}
