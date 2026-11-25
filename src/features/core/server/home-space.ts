import "server-only";
import { cache } from "react";
import { getSpaces } from "@/features/tasks/server/queries";
import type { Viewer } from "@/lib/supabase/server";

/** O espaço da casa: "Nós" quando existe, senão o pessoal (cozinha, datas, lugares, memórias). */
export const homeSpace = cache(async (viewer: Viewer) => {
  const spaces = await getSpaces(viewer);
  return spaces.find((s) => s.kind === "shared") ?? spaces.find((s) => s.kind === "personal")!;
});
