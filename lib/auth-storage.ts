// lib/auth-storage.ts
"use client";

export const AUTH_TOKEN_KEY = "authToken";

export function setToken(token: string) {
  if (typeof window === "undefined") return;

  // store in localStorage
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  // store in cookie as well (for middleware)
  document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24 * 7};`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearToken() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(AUTH_TOKEN_KEY);
  // delete cookie
  document.cookie = "authToken=; path=/; max-age=0;";
}
