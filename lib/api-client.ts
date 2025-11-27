// lib/api-client.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import axios from "axios";
import { getToken, clearToken } from "./auth-storage";

const rawClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.53:5000",
});

// Attach token automatically
rawClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization =
        `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 (expired or invalid token)
rawClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken();
      // you may also route to login here if you want
      // window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

// 👇 Custom “soft-typed” interface so res.data is never `unknown`
type ApiClient = {
  // If you pass <T>, data is T; if not, it's any
  get<T = any>(url: string, config?: any): Promise<{ data: T }>;
  post<T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<{ data: T }>;
  put<T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<{ data: T }>;
  delete<T = any>(url: string, config?: any): Promise<{ data: T }>;
} & typeof rawClient;

// Cast axios instance to our nicer interface
const apiClient = rawClient as ApiClient;

export default apiClient;
