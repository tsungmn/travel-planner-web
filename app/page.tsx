import { redirect } from "next/navigation";

import { hasValidSession } from "@/lib/serverAuth";

export default async function Home() {
  redirect((await hasValidSession()) ? "/trips" : "/login");
}
