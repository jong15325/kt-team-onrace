# 1단계: base 설정
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpm 10.x 고정: v9.0 lockfile/overrides 호환 + strictDepBuilds 기본 false(무시된 빌드 스크립트를 경고 처리).
# pnpm 11의 corepack "latest"는 strictDepBuilds=true 라 sharp 등 미승인 빌드에서 ERR_PNPM_IGNORED_BUILDS 로 실패함.
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

# 2단계: 의존성 설치
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# lockfile 이 package.json 의 pnpm.overrides 와 어긋나 있어(로컬에서 재생성/커밋 안 됨) frozen 설치가 거부됨.
# --no-frozen-lockfile 로 컨테이너 내에서 lockfile 을 package.json 에 맞춰 갱신하여 설치.
# (더 엄격한 재현성이 필요하면 로컬에서 `pnpm install` 후 pnpm-lock.yaml 을 커밋하고 --frozen-lockfile 로 되돌릴 것)
RUN pnpm install --no-frozen-lockfile

# 3단계: 빌드 (환경 변수를 이 단계로 가져와야 합니다)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# [중요] Next.js 빌드 시점에 NEXT_PUBLIC 변수가 있어야 자바스크립트에 포함됩니다.
ARG NEXT_PUBLIC_APP_URL

ARG ACCOUNT_API_URL
ARG MAIN_API_URL

ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

ARG KAKAO_CLIENT_ID
ARG KAKAO_CLIENT_SECRET
ARG NAVER_CLIENT_ID
ARG NAVER_CLIENT_SECRET
ARG NEXT_PUBLIC_TOSS_CLIENT_KEY
ARG TOSS_SECRET_KEY

# NEXT_PUBLIC_API_MODE 만 빌드 인자로 명시 제어(기본 real). 나머지 서버/시크릿 변수는
# 빌드 컨텍스트에 복사된 .env 에서 Next 가 읽는다(런타임 값은 compose 가 주입).
# 주의: 빈 ARG 를 ENV 로 승격하면 시스템 env 가 .env 를 덮어써 NEXTAUTH_URL="" → 빌드 중 Invalid URL 이 발생한다.
ARG NEXT_PUBLIC_API_MODE=real
ENV NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE

RUN pnpm run build

# 4단계: 실행
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# 실행 시점에도 필요한 환경 변수 설정
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# standalone 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]