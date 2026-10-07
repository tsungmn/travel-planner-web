const DEFAULT_NEXT_PATH = "/trips";

/**
 * 로그인 후 이동할 경로를 `?next=` 값에서 꺼냅니다.
 * 외부 URL이나 특수 스킴으로 이동하지 않도록 같은 사이트의 경로만 허용합니다.
 */
export function getNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return DEFAULT_NEXT_PATH;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return DEFAULT_NEXT_PATH;
  return value;
}
