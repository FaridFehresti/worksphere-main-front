// lib/logout.ts
"use client";

import { useRouter } from "next/navigation";
import { clearToken } from "./auth-storage";

export function useLogout() {
  const router = useRouter();

  return () => {
    clearToken();
    router.push("/auth/login");
  };
}
