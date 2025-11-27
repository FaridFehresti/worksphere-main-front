// lib/voice/voice-socket.ts
"use client";

import { io, Socket } from "socket.io-client";
import { getToken } from "../auth-storage";

let socket: Socket | null = null;

export function getVoiceSocket(): Socket {
  if (socket) return socket;

  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.53:5000";

  console.log("[voice-socket] creating socket for", `${baseURL}/voice`);

  socket = io(`${baseURL}/voice`, {
    transports: ["websocket"],
    autoConnect: false,
  });

  const token = getToken();
  if (token) {
    (socket as any).auth = { token };
    console.log("[voice-socket] initial auth token set");
  }

  return socket;
}
