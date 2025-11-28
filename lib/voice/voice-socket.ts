// lib/voice/voice-socket.ts
"use client";

import { io, Socket } from "socket.io-client";
import { getToken } from "../auth-storage";

let socket: Socket | null = null;

function resolveOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL || "https://faridtech.org/api";

  let base = raw.replace(/\/+$/, "");
  base = base.replace(/\/api$/, "");

  return base; // -> "https://faridtech.org"
}

export function getVoiceSocket(): Socket {
  if (socket) return socket;

  const origin = resolveOrigin();
  const token = getToken();

  console.log("[voice-socket] creating socket for", `${origin}/voice`);

  socket = io(`${origin}/voice`, {
    path: "/socket.io",

    // 🔴 TEMP: force polling only (no websocket)
    transports: ["polling"],

    autoConnect: false,

    // ✅ send token on initial handshake
    auth: token ? { token } : undefined,

    withCredentials: true,
  });

  return socket;
}
