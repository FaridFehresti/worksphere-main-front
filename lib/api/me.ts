import apiClient from "../api-client";

export async function fetchCurrentUser() {
  const res = await apiClient.get("/users/me");
  return res.data;
}
