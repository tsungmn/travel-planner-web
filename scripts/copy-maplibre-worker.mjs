// maplibre-gl 워커 파일을 node_modules에서 public/으로 복사한다.
// setWorkerUrl("/maplibre-gl-worker.mjs")가 가리키는 파일이 이 스크립트로 만들어진다.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "node_modules", "maplibre-gl", "dist");
const publicDir = join(process.cwd(), "public");

if (!existsSync(distDir)) {
  console.warn(
    "[copy-maplibre-worker] maplibre-gl이 설치되어 있지 않아 건너뜁니다.",
  );
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });

// 워커(maplibre-gl-worker.mjs)가 옆에 있는 maplibre-gl-shared.mjs 같은
// 청크를 런타임에 import하므로 maplibre-gl-*.mjs를 전부 복사한다.
const files = readdirSync(distDir).filter((name) =>
  /^maplibre-gl-.+\.mjs$/.test(name),
);

if (!files.includes("maplibre-gl-worker.mjs")) {
  console.error(
    "[copy-maplibre-worker] maplibre-gl-worker.mjs를 찾지 못했습니다. maplibre-gl 버전을 확인하세요.",
  );
  process.exit(1);
}

for (const name of files) {
  copyFileSync(join(distDir, name), join(publicDir, name));
  console.log(`[copy-maplibre-worker] public/${name}`);
}
