import type { Metadata } from "next";

import { NotFound } from "@/components/common/NotFound";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요 · 여행길",
};

export default function NotFoundPage() {
  return <NotFound />;
}
