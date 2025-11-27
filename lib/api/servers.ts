// lib/api/servers.ts
"use client";

import apiClient from "../api-client";

export type Server = {
  id: string;
  name: string;
  type: "TEXT" | "VOICE";
};

export async function fetchServersForTeam(teamId: string): Promise<Server[]> {
  const res = await apiClient.get(`/servers/team/${teamId}`);
  return res.data;
}
