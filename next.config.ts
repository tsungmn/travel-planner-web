import type { NextConfig } from "next";

// 백엔드(FastAPI) 주소. lib/serverAuth.ts도 같은 환경 변수를 씁니다.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const isProd = process.env.NODE_ENV === "production";

// 지도 스타일, 타일, 글꼴, 스프라이트가 모두 이 호스트에서 옵니다. (components/.../TripMap 의 스타일 URL)
const MAP_ORIGIN = "https://tiles.openfreemap.org";
// 가입, 비밀번호 찾기의 봇 방지(lib/turnstile.ts)
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * 콘텐츠 보안 정책. 개발 서버(HMR, eval 기반 소스맵)와 맞지 않아 운영 빌드에서만 붙입니다.
 *
 * script-src, style-src 에 'unsafe-inline'이 있는 이유: Next.js가 페이지에 넣는 인라인 스크립트(하이드레이션 데이터)와
 * Mantine의 인라인 스타일 때문입니다. nonce 방식으로 바꾸려면 모든 페이지를 요청마다 렌더링해야 해서 하지 않았습니다.
 * 그래도 아래 항목들이 외부로 데이터를 보내거나, 페이지를 프레임에 넣거나, 폼을 다른 곳으로 보내는 것을 막아 줍니다.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${MAP_ORIGIN}`,
  `font-src 'self' data: ${MAP_ORIGIN}`,
  `connect-src 'self' ${MAP_ORIGIN} ${TURNSTILE_ORIGIN}`,
  "worker-src 'self' blob:",
  `frame-src ${TURNSTILE_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** 모든 페이지에 붙는 보안 헤더 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트가 이 페이지를 프레임에 넣어 클릭을 가로채는 것을 막습니다. (옛 브라우저용, CSP frame-ancestors와 같은 뜻)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // 지도의 "내 위치" 버튼(GeolocateControl)이 쓰므로 geolocation은 같은 사이트에서만 허용합니다.
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        // https로만 접속하게 합니다. (서브도메인과 preload는 일부러 넣지 않았습니다)
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // 서버 종류를 알려 주는 X-Powered-By 헤더는 필요 없습니다.
  poweredByHeader: false,
  // 브라우저는 항상 같은 origin의 /api로 요청하고, Next가 백엔드로 넘겨 줍니다.
  // 덕분에 CORS가 필요 없고, 로그인 쿠키와 Google OAuth 콜백도 이 도메인 기준으로 동작합니다.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
  // 공항 목록(약 1.5MB)은 자주 바뀌지 않으니 브라우저가 한동안 재사용하게 합니다.
  async headers() {
    return [
      // 같은 헤더 키가 겹치면 아래에 있는 규칙이 이깁니다. (아래의 Referrer-Policy: no-referrer가 이 값을 덮어씁니다)
      { source: "/:path*", headers: securityHeaders },
      // 메일 링크의 토큰이 주소에 잠깐 있는 페이지: 검색 노출과 Referer 유출을 막습니다.
      {
        source: "/:path(verify-email|reset-password)",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
