// OurAirports 에서 "정기 여객편이 있는 공항" 목록을 받아 data/scheduled-airports.json 에 저장한다.
//   npm run fetch:scheduled
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
// 비행기표로 갈 수 없는 종류는 제외한다. 수상비행장(seaplane_base)은 몰디브처럼 실제 운항이 있어 남긴다.
const EXCLUDED_TYPES = new Set(["closed", "heliport", "balloonport"]);

// 따옴표 안의 쉼표, 줄바꿈, "" 이스케이프를 처리하는 최소 CSV 파서
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const response = await fetch(URL);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const [header, ...rows] = parseCsv(await response.text());
const col = Object.fromEntries(header.map((name, index) => [name, index]));
for (const name of ["iata_code", "type", "scheduled_service"]) {
  if (!(name in col))
    throw new Error(`CSV 에 ${name} 컬럼이 없다: ${header.join(", ")}`);
}

const scheduled = {};
for (const row of rows) {
  const iata = row[col.iata_code]?.trim().toUpperCase();
  const type = row[col.type];
  if (!iata || row[col.scheduled_service] !== "yes" || EXCLUDED_TYPES.has(type))
    continue;
  scheduled[iata] = { type }; // large_airport | medium_airport | small_airport | seaplane_base
}

await mkdir(resolve(process.cwd(), "data"), { recursive: true });
await writeFile(
  resolve(process.cwd(), "data/scheduled-airports.json"),
  JSON.stringify(scheduled),
);
console.log(`정기 여객편이 있는 공항 ${Object.keys(scheduled).length}개 저장`);
