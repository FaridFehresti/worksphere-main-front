// lib/api/servers.ts
"use client";

import apiClient from "../api-client";
// adjust this import path to wherever you define API_ENDPOINT
import { API_ENDPOINT } from "../api-url";

export type Server = {
  id: string;
  name: string;
  type: "TEXT" | "VOICE";
  teamId: string;
  createdAt: string;
};

export async function fetchServersForTeam(teamId: string): Promise<Server[]> {
  const res = await apiClient.get(API_ENDPOINT.servers.byTeam(teamId));
  return res.data;
}

// POST /servers
// Body shape assumed by your Nest backend: { teamId, name, type }
export async function createServer(
  teamId: string,
  payload: { name: string; type: "TEXT" | "VOICE" }
): Promise<Server> {
  const res = await apiClient.post(API_ENDPOINT.servers.base, {
    teamId,
    ...payload,
  });
  return res.data;
}
