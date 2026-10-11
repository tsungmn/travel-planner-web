/** 공유 링크 주소. 토큰은 서버가 발급한 값을 그대로 씁니다. */
export function buildShareUrl(origin: string, token: string): string {
  return `${origin}/s/${token}`;
}
