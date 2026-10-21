/**
 * 브라우저에서 백엔드(`/api/*`)를 부르는 fetch 래퍼입니다.
 *
 * `/api`는 next.config.ts의 rewrites가 백엔드로 넘겨 주므로 같은 origin으로 요청하고,
 * 로그인 쿠키(`sid`)는 브라우저가 알아서 실어 보냅니다.
 * 서버 컴포넌트에서는 쓰지 않습니다. (lib/serverAuth.ts 참고)
 */

export class ApiError extends Error {
  readonly status: number;
  /** 백엔드가 `detail`로 내려주는 코드. 예: "invalid_credentials", "email_taken" */
  readonly code: string | null;

  constructor(status: number, code: string | null) {
    super(code ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /**
   * 401을 받으면 로그인 화면으로 보냅니다. (기본 true)
   * 로그인·가입·로그아웃처럼 401이 정상적인 결과인 요청에서는 false로 두세요.
   */
  redirectOnUnauthorized?: boolean;
};

/** `path`는 `/api` 뒤부터 씁니다. 예: `request("/auth/me")` → `GET /api/auth/me` */
export async function request<T = void>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    signal,
    redirectOnUnauthorized = true,
  } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    // 호출한 쪽에서 취소한 요청은 그대로 던집니다.
    if (signal?.aborted) throw error;
    throw new ApiError(0, "network_error");
  }

  if (response.status === 401 && redirectOnUnauthorized) {
    redirectToLogin();
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorCode(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "detail" in data) {
      const { detail } = data as { detail: unknown };
      if (typeof detail === "string") return detail;
      // FastAPI의 입력 검증 오류(422)는 detail이 배열입니다.
      if (Array.isArray(detail)) return "validation_error";
    }
  } catch {
    // JSON이 아닌 응답(프록시 오류 페이지 등)은 코드 없이 처리합니다.
  }
  return null;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/login") return;
  // React 바깥(lib)에서 호출되고 클라이언트 상태를 초기화하는 전체 페이지 이동이 필요해 router를 쓰지 않습니다.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(
    `/login?next=${encodeURIComponent(`${pathname}${search}`)}`,
  );
}
