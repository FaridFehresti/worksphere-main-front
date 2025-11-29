// lib/hooks/useCurrentUser.ts
"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/store/user";
import { getToken, clearToken } from "@/lib/auth-storage";
import apiClient from "@/lib/api-client";
import { API_ENDPOINT } from "@/lib/api-url";
import type { IUser } from "@/lib/types/user";

export function useCurrentUser() {
  const user = useUserStore((s) => s.user);
  const isLoaded = useUserStore((s) => s.isLoaded);
  const setUser = useUserStore((s) => s.setUser);
  const setLoaded = useUserStore((s) => s.setLoaded);

  useEffect(() => {
    const token = getToken();

    // no token → logged out
    if (!token) {
      if (!isLoaded) {
        setUser(null);
        setLoaded(true);
      }
      return;
    }

    // already loaded once → do nothing
    if (isLoaded) return;

    (async () => {
      try {
        const res = await apiClient.get<IUser>(API_ENDPOINT.auth.me);
        setUser(res.data);
      } catch (err: any) {
        console.error("Failed to fetch /me", err);
        clearToken();
        setUser(null);
      } finally {
        setLoaded(true);
      }
    })();
  }, [isLoaded, setUser, setLoaded]);

  return { user, isLoaded };
}
