// lib/api/channels.ts
"use client";

import apiClient from "../api-client";
import { API_ENDPOINT } from "../api-url";

export type Channel = {
  id: string;
  name: string;
  type: "TEXT" | "VOICE";
  serverId: string;
};

export async function fetchChannelsForServer(
  serverId: string
): Promise<Channel[]> {
  const res = await apiClient.get(API_ENDPOINT.channels.byServer(serverId));
  return res.data;
}

export async function createChannel(payload: {
  serverId: string;
  name: string;
  type: "TEXT" | "VOICE";
}) {
  const res = await apiClient.post(API_ENDPOINT.channels.base, payload);
  return res.data;
}
