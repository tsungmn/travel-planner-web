# syntax=docker/dockerfile:1

# ── 1) 의존성 설치 ─────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
# husky(prepare)는 컨테이너에서 필요 없고, playwright 브라우저도 받을 필요가 없다
ENV HUSKY=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# postinstall(copy-maplibre-worker)이 쓰는 스크립트만 먼저 넣어 두면
# 소스가 바뀌어도 npm ci 레이어 캐시가 유지된다. (postinstall을 건너뛰면 안 된다)
COPY scripts/copy-maplibre-worker.mjs scripts/
# 빌드에 typescript, babel-plugin-react-compiler 등 devDependencies가 필요하다
RUN npm ci

# ── 2) 빌드 ────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# next.config.ts 의 rewrites()는 빌드 시점에 확정된다.
# 런타임 환경변수(web-config)로는 바꿀 수 없으므로 클러스터 내부 주소를 여기서 넣는다.
ARG API_ORIGIN=http://api-service
ENV API_ORIGIN=${API_ORIGIN}

# NEXT_PUBLIC_* 도 빌드 시점에 번들에 박힌다. 비어 있으면 설정하지 않은 것으로 취급한다.
# (빈 문자열로 박히면 useSiteOrigin 이 window.location.origin 대신 ""를 쓰게 된다)
ARG NEXT_PUBLIC_SITE_URL=
# Cloudflare Turnstile 사이트 키 (공개 값). 비어 있으면 봇 방지 위젯을 쓰지 않는다.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# public/maplibre-gl-*.mjs 는 .gitignore 대상이라 소스에 없으므로 다시 만든다
RUN node scripts/copy-maplibre-worker.mjs

# 공항 데이터는 git 에 커밋돼 있어야 한다. 없으면 prod 에서 공항 검색이 동작하지 않는다.
RUN test -s public/data/airports.json \
    || (echo "public/data/airports.json 이 없습니다. .gitignore 의 /public/data/ 를 지우고 커밋하세요." >&2; exit 1)

RUN if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then unset NEXT_PUBLIC_SITE_URL; fi; \
    if [ -z "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" ]; then unset NEXT_PUBLIC_TURNSTILE_SITE_KEY; fi; \
    npm run build

# next.config.ts 에 output: "standalone" 이 없으면 여기서 멈춘다
RUN test -f .next/standalone/server.js \
    || (echo "next.config.ts 에 output: \"standalone\" 을 추가하세요." >&2; exit 1)

# ── 3) 실행 ────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]