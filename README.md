# 여행길 (travel-planner-web)

지도 위에서 여행 일정을 짜는 웹 애플리케이션의 프론트엔드입니다. 여행지와 기간을 정하고, 항공편·숙소·일자별 장소를 입력하면 일차별 동선이 지도에 표시됩니다. 읽기 전용 공유 링크로 일정을 다른 사람에게 보여줄 수 있습니다.

## 주요 기능

**여행 관리**
- 여행지 검색과 기간 선택으로 여행 생성 (최대 61일)
- 여행 목록, 정보 수정, 삭제
- 기간을 줄일 때 범위 밖에 남은 장소가 있으면 서버가 거부 (`409 stops_out_of_range`)

**일정 편집**
- 일차 탭과 전체 일정 보기
- 장소 검색 후 일차별 추가, 별칭(최대 50자)과 메모(최대 1,000자) 입력
- 드래그로 순서 변경과 일차 간 이동 (변경 내용을 한 번에 저장하며, 실패하면 전부 취소)
- 인접한 장소 사이의 직선거리 표시
- 일차마다 다른 색상 (7색 순환)으로 마커와 동선 구분

**항공편**
- 출국/귀국 구분, 편명, 출발·도착 공항과 현지 시각 입력 (여행당 최대 10건)
- 공항은 IATA 코드, 한글·영문 공항명, 도시명, 별칭으로 검색
- 출발·도착 공항을 해당 일차의 일정과 지도에 자동 표시 (DB에 저장하지 않고 항공편에서 매번 계산)

**숙소**
- 장소 검색 또는 지도 클릭으로 위치 지정 (검색 목록에 없는 숙소도 입력 가능)
- 체크인·체크아웃 날짜, 메모 입력

**공유**
- 공유 링크 발급·해제 (`/s/{token}`)
- 공유 화면은 로그인 없이 열리며 읽기 전용

**지도와 화면**
- MapLibre GL 기반 지도, 한국 남북 경계(DMZ)와 일부 바다·국가 표기를 별도 처리
- 모바일에서는 바텀시트(접힘 / 절반 / 거의 전체)로 패널 표시

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router), React 19, React Compiler |
| 언어 | TypeScript |
| UI | Mantine 9, Tabler Icons, CSS Modules (postcss-preset-mantine) |
| 지도 | MapLibre GL, react-map-gl, OpenFreeMap (Liberty 스타일) |
| 드래그 정렬 | @dnd-kit/react, @dnd-kit/helpers |
| 날짜 | dayjs |
| 코드 품질 | ESLint, Prettier, husky, lint-staged |

## 아키텍처

```
브라우저 ──(같은 origin) /api/*──▶ Next.js ──(rewrites)──▶ FastAPI (API_ORIGIN)
```

- 브라우저는 항상 같은 origin의 `/api`로 요청하고, Next.js가 `next.config.ts`의 `rewrites`로 백엔드에 전달합니다. 따라서 CORS 설정이 필요 없습니다.
- 로그인 세션은 `sid` 쿠키로 유지되며, Google OAuth 콜백도 이 도메인 기준으로 동작합니다.
- 서버 컴포넌트(`app/page.tsx`)는 `lib/serverAuth.ts`로 세션을 확인해 `/trips` 또는 `/login`으로 보냅니다. 백엔드가 5xx이거나 연결되지 않으면 로그아웃으로 간주하지 않고 `app/error.tsx`가 처리합니다.
- 클라이언트 측 API 호출은 `lib/http.ts`의 `request()`를 거칩니다. 401을 받으면 `/login?next=...`로 이동합니다. 로그인·공유 보기처럼 401이 정상 결과인 요청에서는 이 동작을 끌 수 있습니다.

## 시작하기

### 요구 사항

- Node.js 20.9 이상
- npm
- 실행 중인 백엔드 API (`travel-planner-api`)

### 설치

```bash
git clone https://github.com/tsungmn/travel-planner-web.git
cd travel-planner-web
npm install
```

`npm install` 후 `postinstall`이 `maplibre-gl`의 워커 파일(`maplibre-gl-*.mjs`)을 `public/`으로 복사합니다. 이 파일들은 Git에 포함되지 않습니다.

### 환경 변수

프로젝트 루트에 `.env.local`을 만듭니다.

```bash
API_ORIGIN=http://127.0.0.1:8000
# NEXT_PUBLIC_SITE_URL=https://example.com
```

| 변수 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `API_ORIGIN` | 아니오 | `http://127.0.0.1:8000` | 백엔드 주소. `/api/*` 프록시와 서버 측 세션 확인에 사용합니다. |
| `NEXT_PUBLIC_SITE_URL` | 아니오 | 현재 접속 origin | 공유 링크의 기준 주소. |

`rewrites`는 빌드 시점에 확정되므로, 운영 빌드(`npm run build`)에서도 `API_ORIGIN`을 같은 값으로 지정해야 합니다.

### 공항 데이터 준비

항공편 입력의 공항 검색은 `public/data/airports.json`을 사용합니다.

1. 원본 공항 목록 [mwgg/Airports](https://github.com/mwgg/Airports)의 `airports.json`을 `data/airports.json`으로 저장합니다.
2. 아래 명령을 순서대로 실행합니다.

```bash
npm run fetch:scheduled      # OurAirports에서 정기 여객편이 있는 공항 목록 → data/scheduled-airports.json
npm run fetch:airport-names  # Wikidata에서 다국어 공항·도시 이름 → data/wikidata-*.json
npm run build:airports       # 위 데이터를 합쳐 public/data/airports.json 생성
```

- 한국어 이름을 직접 보정하려면 `scripts/airport-overrides.json`에 이름과 별칭을 추가한 뒤 `build:airports`를 다시 실행합니다. 이 파일은 Git에 포함됩니다.
- `build:airports` 실행 후 `data/missing-ko.txt`(정기편이 있는 대형·중형 공항 중 한국어 이름이 없는 목록)와 `data/airports.dropped.txt`(걸러진 공항)가 생성됩니다.
- 이 단계를 건너뛰면 항공편 입력에서 공항 목록을 불러오지 못하고, 나머지 기능은 정상 동작합니다.
- 공항 목록(약 1.5MB)은 항공편 입력이 필요할 때만 한 번 내려받고 브라우저에서 캐시합니다.

### 실행

```bash
npm run dev      # 개발 서버 http://localhost:3000
npm run build    # 운영 빌드
npm run start    # 운영 서버 실행
```

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 운영 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run prettier` | 전체 파일 포맷 |
| `npm run fetch:scheduled` | 정기편 공항 목록 내려받기 |
| `npm run fetch:airport-names` | 공항·도시 다국어 이름 내려받기 (`-- --force`로 재다운로드) |
| `npm run build:airports` | 앱이 읽는 공항 데이터 생성 (`-- --no-filter`로 정기편 필터 해제) |

커밋 시 husky와 lint-staged가 변경된 파일에 Prettier를 적용합니다.

## 페이지

| 경로 | 설명 | 로그인 |
| --- | --- | --- |
| `/` | 세션에 따라 `/trips` 또는 `/login`으로 이동 | - |
| `/login` | 이메일 로그인·가입, Google 로그인 | 불필요 |
| `/trips` | 내 여행 목록 | 필요 |
| `/trips/new` | 여행 만들기 (여행지 → 기간) | 필요 |
| `/trips/[id]` | 여행 상세·편집 (`?day=`, `?view=` 등으로 일차 탭과 하위 화면 관리) | 필요 |
| `/s/[token]` | 공유된 여행 보기 (읽기 전용) | 불필요 |
| `/privacy`, `/terms` | 개인정보처리방침, 이용약관 | 불필요 |

## 백엔드 API

웹 클라이언트가 사용하는 엔드포인트입니다. 모든 경로는 `/api` 아래에 있습니다.

| 영역 | 엔드포인트 |
| --- | --- |
| 인증 | `GET /auth/me`, `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/google` (페이지 이동) |
| 여행 | `GET·POST /trips`, `GET·PATCH·DELETE /trips/{id}` |
| 공유 | `POST·DELETE /trips/{id}/share`, `GET /shared/{token}` |
| 장소 | `POST /trips/{id}/stops`, `PATCH·DELETE /trips/{id}/stops/{stopId}`, `PUT /trips/{id}/stops/order` |
| 항공편 | `POST /trips/{id}/flights`, `PATCH·DELETE /trips/{id}/flights/{flightId}` |
| 숙소 | `POST /trips/{id}/lodgings`, `PATCH·DELETE /trips/{id}/lodgings/{lodgingId}` |
| 장소 검색 | `GET /places/search?q=&mode=suggest\|full&lang=ko&lat=&lng=&nearby=` |

- 장소 검색은 2글자 이상일 때만 요청하며, 좌표를 함께 보내면 반경 50km 안에서만 검색합니다. 이 반경은 백엔드가 고정하며 `constants/search.ts`의 `NEARBY_SEARCH_RADIUS_KM`과 같아야 합니다.
- 장소 검색 오류는 `429`(요청 한도), `503`(서비스 불가), `502`(상위 서비스 오류)를 각각 구분해 처리합니다.
- 오류 응답은 `detail` 필드의 문자열 코드(예: `invalid_credentials`, `email_taken`)를 사용합니다.
- 타입 정의는 `types.ts`, API 호출 함수는 `lib/api.ts`에 있습니다.

## 프로젝트 구조

```
app/                  라우트 (App Router)
components/
  common/             공용 컴포넌트 (Header, MapContainer, TripCard 등)
  page/               페이지별 컴포넌트. 각 폴더에 hooks/, modules/ 포함
    TripDetail/       여행 상세 (TripMap, DayStopList, FlightSection, LodgingSection, PlaceSearch 등)
    TripNew/ TripList/ Login/ SharedTrip/ ...
constants/            상수 (여행 제한값, 지도 설정, 검색 설정)
hooks/                공용 훅 (useMapStyle, useSiteOrigin)
lib/                  API 호출, 인증, 공항 검색, 날짜·거리 계산, 지도 스타일 변환
scripts/              공항 데이터 생성 스크립트, 한국어 이름 보정 파일
theme/                Mantine 테마와 전역 스타일
data/, public/data/   공항 데이터 (Git 제외, 직접 생성)
types.ts              도메인 타입 (Trip, Stop, Flight, Lodging 등)
```

## 데이터 출처

- 지도 타일: [OpenFreeMap](https://openfreemap.org/) (OpenStreetMap 기여자 데이터)
- 공항 원본: [mwgg/Airports](https://github.com/mwgg/Airports)
- 정기편 여부: [OurAirports](https://ourairports.com/data/)
- 다국어 이름: [Wikidata](https://www.wikidata.org/) (CC0)
- 장소 검색 결과의 출처 문구는 백엔드가 `attribution`으로 내려주며 화면에 표시됩니다.