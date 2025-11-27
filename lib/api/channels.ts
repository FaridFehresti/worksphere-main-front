// lib/api/channels.ts
"use client";

import apiClient from "../api-client";

export type Channel = {
  id: string;
  name: string;
  type: "TEXT" | "VOICE";
  serverId: string;
};

export async function fetchChannelsForServer(
  serverId: string
): Promise<Channel[]> {
  const res = await apiClient.get(`/channels/server/${serverId}`);
  return res.data;
}

export async function createChannel(payload: {
  serverId: string;
  name: string;
  type: "TEXT" | "VOICE";
}) {
  const res = await apiClient.post("/channels", payload);
  return res.data;
}
