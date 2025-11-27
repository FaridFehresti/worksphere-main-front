import apiClient from "../api-client";

export async function fetchCurrentUser() {
  const res = await apiClient.get("/auth/me");
  return res.data;
}
