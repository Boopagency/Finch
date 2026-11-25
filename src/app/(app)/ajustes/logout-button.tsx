"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearLocalData } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    await createClient().auth.signOut();
    await clearLocalData();
    window.location.replace("/entrar");
  }
  return (
    <Button variant="danger" onClick={logout} disabled={pending} className="mb-6 self-center">
      Sair deste aparelho
    </Button>
  );
}
