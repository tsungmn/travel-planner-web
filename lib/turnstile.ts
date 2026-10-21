/**
 * Cloudflare Turnstile (봇 방지) 토큰 받기.
 *
 * 사이트 키(NEXT_PUBLIC_TURNSTILE_SITE_KEY)가 없으면 아무것도 하지 않고 null을 돌려줍니다.
 * 서버(TURNSTILE_SECRET_KEY)가 검사를 켜기 전에도 화면이 그대로 동작하게 하려는 것입니다.
 *
 * 위젯은 평소에는 보이지 않고(interaction-only), Cloudflare가 사람인지 더 확인해야 할 때만
 * 화면 아래에 나타납니다. 토큰은 한 번만 쓸 수 있어서 요청마다 새로 받습니다.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TIMEOUT_MS = 60_000;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export class CaptchaError extends Error {
  constructor() {
    super("captcha");
    this.name = "CaptchaError";
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new CaptchaError());
    script.onerror = () => {
      scriptPromise = null; // 광고 차단 등으로 막혔다가 풀리면 다시 시도할 수 있게
      script.remove();
      reject(new CaptchaError());
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** 사이트 키가 설정돼 있는지. 없으면 getTurnstileToken()은 null을 돌려줍니다. */
export const isTurnstileEnabled = Boolean(SITE_KEY);

export async function getTurnstileToken(): Promise<string | null> {
  if (!SITE_KEY) return null;
  const turnstile = await loadScript();

  return new Promise<string>((resolve, reject) => {
    // 확인이 더 필요할 때만 보이는 자리. 화면 아래 가운데에 띄웁니다.
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000";
    document.body.appendChild(host);

    let widgetId: string | null = null;
    let settled = false;
    const finish = (result: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (widgetId !== null) turnstile.remove(widgetId);
      host.remove();
      result();
    };
    const timer = setTimeout(
      () => finish(() => reject(new CaptchaError())),
      TIMEOUT_MS,
    );
    const fail = () => finish(() => reject(new CaptchaError()));

    try {
      widgetId = turnstile.render(host, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        callback: (token) => finish(() => resolve(token)),
        "error-callback": fail,
        "timeout-callback": fail,
        "expired-callback": fail,
      });
    } catch {
      fail();
    }
  });
}
