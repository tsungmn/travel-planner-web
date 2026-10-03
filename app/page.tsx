import styles from "./page.module.css";
import { KoreaBoundaryPatch } from "@/components/common/KoreaBoundaryPatch";
import { MapContainer } from "@/components/common/MapContainer";

export default function Home() {
  return (
    <main className={styles.main}>
      <MapContainer id="main-map">
        <KoreaBoundaryPatch />
      </MapContainer>
    </main>
  );
}
