// Wikidata에서 공항 이름과 도시 이름(한국어, 영어, 일본어, 중국어)을 내려받아 data/ 에 저장한다.
//
//   npm run fetch:airport-names             이미 받은 파일은 건너뛴다
//   npm run fetch:airport-names -- --force  전부 다시 받는다
//
// 저장하는 파일 (둘 다 .gitignore 대상, 다음 단계인 build-airports.mjs 가 읽는다)
//   data/wikidata-airports.json  IATA 코드가 있는 공항의 언어별 이름과 좌표
//   data/wikidata-places.json    공항이 서비스하는 도시/지역의 언어별 이름
//
// Wikidata 의 데이터는 CC0 이다. 쿼리 서비스 이용 안내: https://www.wikidata.org/wiki/Wikidata:Data_access
import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ENDPOINT = "https://query.wikidata.org/sparql";
// 쿼리 서비스는 User-Agent 로 클라이언트를 식별하고 연락처를 포함하길 요구한다.
// TODO: 본인 이메일이나 저장소 주소로 바꾼다.
const USER_AGENT =
  "travel-planner-airports/1.0 (https://github.com/your-id/travel-planner; you@example.com)";
const LANGS = ["en", "ko", "ja", "zh", "zh-hans", "zh-cn", "zh-hant", "zh-tw"];
const LANG_FILTER = LANGS.map((lang) => `"${lang}"`).join(", ");

// 도시 쿼리는 IATA 코드 첫 글자(A~Z)로 나눠서 요청한다.
// 한 번에 전체를 요청하면 쿼리 서비스의 서버 시간 제한(약 60초)에 걸려 504 가 난다.
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
// P931: 공항이 서비스하는 도시, P131: 공항이 있는 행정 구역
const PLACE_RELATIONS = [
  ["served", "P931"],
  ["located", "P131"],
];
// 요청 사이에 두는 간격. 쿼리 서비스에 부담을 주지 않기 위해서다.
const REQUEST_GAP_MS = 1500;

const AIRPORT_QUERY = `
SELECT ?airport ?iata ?coord ?lang ?label WHERE {
  ?airport wdt:P238 ?iata .
  OPTIONAL { ?airport wdt:P625 ?coord . }
  ?airport rdfs:label ?label .
  BIND(LANG(?label) AS ?lang)
  FILTER(?lang IN (${LANG_FILTER}))
}`;

const placeQuery = (prefix, prop) => `
SELECT ?airport ?place ?lang ?label WHERE {
  ?airport wdt:P238 ?iata .
  FILTER(STRSTARTS(?iata, "${prefix}"))
  ?airport wdt:${prop} ?place .
  ?place rdfs:label ?label .
  BIND(LANG(?label) AS ?lang)
  FILTER(?lang IN (${LANG_FILTER}))
}`;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const value = (cell) => cell?.value;
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

async function runQuery(name, query, attempts = 3) {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  for (let attempt = 1; ; attempt += 1) {
    let delay = 5000 * attempt;
    try {
      console.log(`${name}: 요청 중... (${attempt}/${attempts})`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/sparql-results+json",
        },
        signal: AbortSignal.timeout(180_000),
      });
      if (response.ok) return (await response.json()).results.bindings;

      const error = new Error(`HTTP ${response.status}`);
      // 429(요청 과다)와 5xx 는 잠시 뒤 다시 시도하고, 나머지 4xx 는 바로 실패시킨다.
      if (response.status !== 429 && response.status < 500) {
        error.fatal = true;
        throw error;
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      if (retryAfter > 0) delay = retryAfter * 1000;
      throw error;
    } catch (error) {
      if (error.fatal || attempt === attempts) throw error;
      console.warn(`${name}: ${error.message}, ${delay / 1000}초 뒤 다시 시도`);
      await sleep(delay);
    }
  }
}

// 한 조각(관계 + IATA 접두사)을 받는다.
// 한 글자 조각이 계속 실패하면 두 글자(AA, AB, ...)로 더 잘게 쪼개서 다시 받는다.
async function fetchPlaceChunk(rel, prop, prefix) {
  const name = `도시 이름 ${rel}/${prefix}`;
  try {
    const rows = await runQuery(name, placeQuery(prefix, prop), 2);
    await sleep(REQUEST_GAP_MS);
    return rows.map((row) => ({
      airport: value(row.airport),
      place: value(row.place),
      rel,
      lang: value(row.lang),
      label: value(row.label),
    }));
  } catch (error) {
    if (error.fatal || prefix.length >= 2) throw error;
    console.warn(
      `${name}: 실패(${error.message}), 두 글자 단위로 나눠서 다시 받는다`,
    );
    const rows = [];
    for (const letter of LETTERS) {
      rows.push(...(await fetchPlaceChunk(rel, prop, prefix + letter)));
    }
    return rows;
  }
}

async function fetchAirports() {
  const rows = await runQuery("공항 이름", AIRPORT_QUERY);
  return rows.map((row) => ({
    id: value(row.airport),
    iata: value(row.iata),
    coord: value(row.coord) ?? null,
    lang: value(row.lang),
    label: value(row.label),
  }));
}

async function fetchPlaces() {
  const places = [];
  const total = PLACE_RELATIONS.length * LETTERS.length;
  let done = 0;
  for (const [rel, prop] of PLACE_RELATIONS) {
    for (const letter of LETTERS) {
      places.push(...(await fetchPlaceChunk(rel, prop, letter)));
      done += 1;
      console.log(`도시 이름 진행: ${done}/${total} (누적 ${places.length}줄)`);
    }
  }
  return places;
}

async function main() {
  const force = process.argv.includes("--force");
  const dataDir = resolve(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });

  const airportsPath = resolve(dataDir, "wikidata-airports.json");
  const placesPath = resolve(dataDir, "wikidata-places.json");

  if (!force && (await exists(airportsPath))) {
    console.log(
      "공항 이름: 이미 받은 파일이 있어 건너뜀 (다시 받으려면 --force)",
    );
  } else {
    const airports = await fetchAirports();
    await writeFile(airportsPath, JSON.stringify(airports));
    console.log(`공항 이름 ${airports.length}줄 저장`);
  }

  if (!force && (await exists(placesPath))) {
    console.log(
      "도시 이름: 이미 받은 파일이 있어 건너뜀 (다시 받으려면 --force)",
    );
  } else {
    const places = await fetchPlaces();
    await writeFile(placesPath, JSON.stringify(places));
    console.log(`도시 이름 ${places.length}줄 저장`);
  }

  console.log("다음: npm run build:airports");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
