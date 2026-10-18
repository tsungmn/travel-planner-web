import type { NextConfig } from "next";

// 백엔드(FastAPI) 주소. lib/serverAuth.ts도 같은 환경 변수를 씁니다.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // 브라우저는 항상 같은 origin의 /api로 요청하고, Next가 백엔드로 넘겨 줍니다.
  // 덕분에 CORS가 필요 없고, 로그인 쿠키와 Google OAuth 콜백도 이 도메인 기준으로 동작합니다.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
  // 공항 목록(약 1.5MB)은 자주 바뀌지 않으니 브라우저가 한동안 재사용하게 합니다.
  async headers() {
    return [
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
