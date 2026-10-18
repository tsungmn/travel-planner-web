import { useCallback, useEffect, useRef, useState } from "react";

const COOLDOWN_SECONDS = 60;

/**
 * 메일 전송 요청(인증 메일 재전송, 비밀번호 재설정)의 60초 쿨다운을 관리합니다.
 * - `send(email)`은 받은 이메일로 바로 요청하고, 성공하면 true를 돌려주며 쿨다운을 시작합니다.
 *   (이메일을 상태에 저장하지 않으니, 값을 바꾼 직후에 불러도 예전 값이 나가지 않습니다.)
 * - `secondsLeft`가 0보다 크면 버튼을 비활성화하고 카운트다운 문구를 보여 줍니다.
 */
export function useResendCooldown(resend: (email: string) => Promise<void>) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "sent" | "rate-limited" | "error"
  >("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setSecondsLeft(COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const send = useCallback(
    async (email: string): Promise<boolean> => {
      if (busyRef.current || secondsLeft > 0) return false;
      busyRef.current = true;
      setSending(true);
      setStatus("idle");
      try {
        await resend(email);
        setStatus("sent");
        startCooldown();
        return true;
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? (error as { code: string }).code
            : null;
        setStatus(code === "tooManyAttempts" ? "rate-limited" : "error");
        return false;
      } finally {
        busyRef.current = false;
        setSending(false);
      }
    },
    [resend, secondsLeft, startCooldown],
  );

  return { secondsLeft, sending, status, send };
}
