// lib/api-client.ts
"use client";

import axios from "axios";
import { getToken, clearToken } from "./auth-storage";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.53:5000",
});

// Attach token automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 (expired or invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken();
      // you may also route to login in the component
    }
    return Promise.reject(error);
  }
);

export default apiClient;
