// 원본 공항 목록 + Wikidata 다국어 이름 + OurAirports 정기편 정보를 합쳐서
// 앱이 쓰는 public/data/airports.json 을 만든다.
//
//   npm run build:airports
//   npm run build:airports -- --no-filter   (정기편 필터 없이 전부 만든다. 디버깅용)
//
// 입력
//   data/airports.json              원본 (mwgg/Airports). 없으면 public/data/airports.json 으로 폴백
//   data/wikidata-airports.json     npm run fetch:airport-names
//   data/wikidata-places.json       npm run fetch:airport-names
//   data/scheduled-airports.json    npm run fetch:scheduled
//   scripts/airport-overrides.json  손으로 관리하는 한국어 이름/별칭 (git 에 커밋한다)
// 출력
//   public/data/airports.json       앱이 읽는 결과
//   data/airports.dropped.txt       걸러진 공항 (검토용)
//   data/missing-ko.txt             정기편이 있는 L/M 공항 중 name_ko 가 없는 것 (override 후보)
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const RAW_PATH = resolve(root, "data/airports.json");
const OUT_PATH = resolve(root, "public/data/airports.json");
const WD_AIRPORTS = resolve(root, "data/wikidata-airports.json");
const WD_PLACES = resolve(root, "data/wikidata-places.json");
const SCHEDULED_PATH = resolve(root, "data/scheduled-airports.json");
const OVERRIDES_PATH = resolve(root, "scripts/airport-overrides.json");
const DROPPED_PATH = resolve(root, "data/airports.dropped.txt");
const MISSING_KO_PATH = resolve(root, "data/missing-ko.txt");

const NO_FILTER = process.argv.includes("--no-filter");

// 정기편 플래그가 no 로 되어 있지만 실제로 비행기표를 살 수 있는 공항을 직접 추가한다.
const KEEP_IATA = new Set([]);

// OurAirports 의 type -> 검색 정렬용 크기
const SIZE = {
  large_airport: "L",
  medium_airport: "M",
  small_airport: "S",
  seaplane_base: "S",
};

// 출력 접미사 -> Wikidata 언어 코드 (앞쪽이 우선)
const FIELDS = {
  ko: ["ko"],
  ja: ["ja"],
  zh: ["zh-cn", "zh-hans", "zh"],
  zh_tw: ["zh-hant", "zh-tw"],
};
const SUFFIXES = Object.keys(FIELDS);

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const readJsonIfExists = async (path, fallback) =>
  existsSync(path) ? readJson(path) : fallback;
const qidNumber = (id) => Number(id.split("/").pop().slice(1));
const round = (n) => Math.round(n * 10_000) / 10_000;

// "Point(경도 위도)" -> { lon, lat }
function parseCoord(coord) {
  const match = coord?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return match ? { lon: Number(match[1]), lat: Number(match[2]) } : null;
}

// { ko: "..", ja: ".." } -> { ko: "..", zh: ".." } (기준 이름과 같은 값은 생략)
function pickLabels(byLang, base) {
  const out = {};
  for (const [suffix, langs] of Object.entries(FIELDS)) {
    const lang = langs.find((l) => byLang[l]);
    if (lang && byLang[lang] !== base) out[suffix] = byLang[lang];
  }
  return out;
}

// 원본을 { iata, name, city, country, tz, lat, lon } 배열로 정리한다.
// 원본은 배열이거나 { ICAO: {...} } 객체일 수 있다.
async function loadSource() {
  let path = RAW_PATH;
  if (!existsSync(RAW_PATH)) {
    path = OUT_PATH;
    console.warn(
      "경고: data/airports.json(원본)이 없어 public/data/airports.json 을 입력으로 쓴다. " +
        "이미 걸러진 공항은 되살릴 수 없다.",
    );
  }
  const json = await readJson(path);
  const list = Array.isArray(json) ? json : Object.values(json);

  const seen = new Set();
  const airports = [];
  let noCode = 0;
  let duplicated = 0;
  let invalid = 0;
  for (const raw of list) {
    // 소문자나 공백이 섞인 코드도 살린다. (예: "Niu")
    const iata = String(raw.iata ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{3}$/.test(iata)) {
      noCode += 1;
      continue;
    }
    if (seen.has(iata)) {
      duplicated += 1;
      continue;
    }
    const lat = Number(raw.lat);
    const lon = Number(raw.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !raw.tz) {
      invalid += 1;
      continue;
    }
    seen.add(iata);
    airports.push({
      iata,
      name: String(raw.name ?? "").trim(),
      city: String(raw.city ?? "").trim(),
      country: raw.country,
      tz: raw.tz,
      lat,
      lon,
    });
  }
  console.log(
    `입력 ${list.length}개 -> IATA 없음 ${noCode}, 중복 ${duplicated}, 좌표/시간대 오류 ${invalid}, 남음 ${airports.length}`,
  );
  return airports;
}

async function main() {
  const [source, wdAirports, wdPlaces, overrides] = await Promise.all([
    loadSource(),
    readJson(WD_AIRPORTS),
    readJson(WD_PLACES),
    readJsonIfExists(OVERRIDES_PATH, {}),
  ]);

  // 1) 정기편이 있는 공항만 남긴다.
  let scheduled = {};
  if (NO_FILTER) {
    console.warn("--no-filter: 정기편 필터를 쓰지 않는다.");
  } else {
    if (!existsSync(SCHEDULED_PATH)) {
      throw new Error(
        "data/scheduled-airports.json 이 없다. 먼저 npm run fetch:scheduled 를 실행한다.",
      );
    }
    scheduled = await readJson(SCHEDULED_PATH);
  }
  const isKept = (a) =>
    NO_FILTER || Boolean(scheduled[a.iata]) || KEEP_IATA.has(a.iata);
  const airports = source.filter(isKept);
  const dropped = source.filter((a) => !isKept(a));

  await writeFile(
    DROPPED_PATH,
    dropped
      .map((a) => `${a.iata}\t${a.name}\t${a.city}\t${a.country}`)
      .join("\n") + "\n",
  );
  if (!NO_FILTER) {
    const known = new Set(source.map((a) => a.iata));
    const absent = Object.keys(scheduled).filter((code) => !known.has(code));
    console.log(
      `정기편 필터: 남김 ${airports.length}, 걸러냄 ${dropped.length} (data/airports.dropped.txt)`,
    );
    console.log(
      `정기편은 있는데 원본에 없는 코드 ${absent.length}개: ${absent.slice(0, 30).join(", ")}`,
    );
  }

  // 2) Wikidata 공항: iata -> 엔티티 후보들 (같은 IATA 에 엔티티가 여럿일 수 있음)
  const byIata = new Map();
  for (const row of wdAirports) {
    const entities = byIata.get(row.iata) ?? new Map();
    const entity = entities.get(row.id) ?? {
      id: row.id,
      coord: parseCoord(row.coord),
      labels: {},
    };
    entity.labels[row.lang] = row.label;
    entities.set(row.id, entity);
    byIata.set(row.iata, entities);
  }

  // 3) Wikidata 도시: 공항 id -> rel -> 도시 id -> 언어별 라벨
  const placesByAirport = new Map();
  for (const row of wdPlaces) {
    const rels = placesByAirport.get(row.airport) ?? {
      served: new Map(),
      located: new Map(),
    };
    const labels = rels[row.rel].get(row.place) ?? {};
    labels[row.lang] = row.label;
    rels[row.rel].set(row.place, labels);
    placesByAirport.set(row.airport, rels);
  }

  // 같은 IATA 후보가 여럿이면 원본 좌표와 가장 가까운 엔티티를 쓴다.
  const pickEntity = (candidates, airport) => {
    const list = [...candidates.values()];
    if (list.length === 1) return list[0];
    const dist = (e) =>
      e.coord
        ? (e.coord.lat - airport.lat) ** 2 + (e.coord.lon - airport.lon) ** 2
        : Infinity;
    return list.sort((a, b) => dist(a) - dist(b))[0];
  };

  // 도시 후보 중 원본 city(영어)와 이름이 같은 것을 우선하고, 없으면 served -> located 순으로 첫 번째.
  const pickPlace = (rels, city) => {
    for (const rel of ["served", "located"]) {
      const entries = [...rels[rel]].sort(
        (a, b) => qidNumber(a[0]) - qidNumber(b[0]),
      );
      if (!entries.length) continue;
      const same = entries.find(
        ([, l]) => l.en && l.en.toLowerCase() === city.toLowerCase(),
      );
      return (same ?? entries[0])[1];
    }
    return null;
  };

  // 4) 합치기. 우선순위: override > Wikidata. 매번 처음부터 만들어서 몇 번을 돌려도 같은 결과가 나온다.
  const stats = { name: 0, nameKo: 0, city: 0, cityKo: 0, override: 0 };
  const unknownOverrides = new Set(Object.keys(overrides));

  const result = airports
    .map((airport) => {
      const { iata, name, city, country, tz, lat, lon } = airport;

      const candidates = byIata.get(iata);
      const entity = candidates && pickEntity(candidates, airport);
      const nameLabels = entity ? pickLabels(entity.labels, name) : {};
      const cityLabels =
        entity && placesByAirport.has(entity.id)
          ? pickLabels(
              pickPlace(placesByAirport.get(entity.id), city) ?? {},
              city,
            )
          : {};

      const override = overrides[iata];
      if (override) {
        unknownOverrides.delete(iata);
        stats.override += 1;
        for (const suffix of SUFFIXES) {
          if (override[`name_${suffix}`])
            nameLabels[suffix] = override[`name_${suffix}`];
          if (override[`city_${suffix}`])
            cityLabels[suffix] = override[`city_${suffix}`];
        }
      }

      if (Object.keys(nameLabels).length) stats.name += 1;
      if (nameLabels.ko) stats.nameKo += 1;
      if (Object.keys(cityLabels).length) stats.city += 1;
      if (cityLabels.ko) stats.cityKo += 1;

      const out = { iata, name };
      for (const suffix of SUFFIXES)
        if (nameLabels[suffix]) out[`name_${suffix}`] = nameLabels[suffix];
      out.city = city;
      for (const suffix of SUFFIXES)
        if (cityLabels[suffix]) out[`city_${suffix}`] = cityLabels[suffix];
      Object.assign(out, { country, tz, lat: round(lat), lon: round(lon) });

      const size = SIZE[scheduled[iata]?.type];
      if (size) out.size = size;
      if (override?.aliases?.length) out.aliases = override.aliases;
      return out;
    })
    .sort((a, b) => a.iata.localeCompare(b.iata));

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2) + "\n");

  // 5) override 후보: 정기편이 있는 L/M 공항 중 한국어 이름이 없는 것 (큰 공항 먼저)
  const missingKo = result
    .filter((a) => (a.size === "L" || a.size === "M") && !a.name_ko)
    .sort((a, b) =>
      a.size === b.size
        ? a.iata.localeCompare(b.iata)
        : a.size === "L"
          ? -1
          : 1,
    );
  await writeFile(
    MISSING_KO_PATH,
    missingKo
      .map(
        (a) =>
          `${a.size}\t${a.iata}\t${a.name}\t${a.city}\t${a.city_ko ?? ""}\t${a.country}`,
      )
      .join("\n") + "\n",
  );

  const bigTotal = result.filter(
    (a) => a.size === "L" || a.size === "M",
  ).length;
  console.log(`공항 ${result.length}개 저장 (public/data/airports.json)`);
  console.log(
    `이름 번역 ${stats.name}개 (한국어 ${stats.nameKo}개), 도시 번역 ${stats.city}개 (한국어 ${stats.cityKo}개), override ${stats.override}개`,
  );
  console.log(
    `L/M 공항 ${bigTotal}개 중 한국어 이름 없음 ${missingKo.length}개 (data/missing-ko.txt)`,
  );
  if (unknownOverrides.size) {
    console.warn(
      `override 에 있지만 결과에 없는 코드: ${[...unknownOverrides].join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
