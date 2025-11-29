// components/dashboard/UserStatusBar.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Settings,
  PhoneOff,
  Signal,
} from "lucide-react";

import { useUserStore } from "@/lib/store/user";
import { useAudioStore } from "@/lib/audio";
import SettingsDialog from "./SettingsDialog";
import { useVoiceChannel } from "@/lib/voice/useVoiceChannel";

export default function UserStatusBar() {
  const user = useUserStore((s) => s.user);
  const micMuted = useAudioStore((s) => s.micMuted);
  const deafened = useAudioStore((s) => s.deafened);
  const toggleMicMuted = useAudioStore((s) => s.toggleMicMuted);
  const toggleDeafened = useAudioStore((s) => s.toggleDeafened);

  const {
    joinedChannelId,
    connecting,
    error,
    leaveChannel,
    pingMs,
  } = useVoiceChannel();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const initials = useMemo(
    () =>
      (user?.name || user?.email || "?")
        .split(" ")
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join("") || "?",
    [user]
  );

  if (!user) return null;

  const handleLeaveVoice = () => {
    leaveChannel();
  };

  // ---------- Voice status + quality ----------

  type Quality = "excellent" | "good" | "fair" | "poor" | "unknown";

  const inVoiceContext = !!joinedChannelId || connecting || !!error;

  const ping =
    typeof pingMs === "number" && Number.isFinite(pingMs) ? pingMs : null;

  const quality: Quality = (() => {
    if (!joinedChannelId || ping == null) return "unknown";
    if (ping <= 50) return "excellent";
    if (ping <= 100) return "good";
    if (ping <= 200) return "fair";
    return "poor";
  })();

  const statusText = (() => {
    if (error) return "Error";
    if (connecting) return "Connecting";
    if (joinedChannelId) return "Connected";
    return "Not in voice";
  })();

  const secondaryText = (() => {
    if (error) return "No connection";
    if (connecting) return "Negotiating…";
    if (joinedChannelId) {
      if (ping != null) return `${Math.round(ping)} ms`;
      return "Awaiting stats…";
    }
    return "Not in voice";
  })();

  const qualityColor = (() => {
    if (error) return "#f97373";        // red
    if (connecting) return "#f59e0b";   // amber

    if (joinedChannelId) {
      if (ping == null) return "#22c55e"; // connected but no stats yet
      switch (quality) {
        case "excellent":
          return "#22c55e"; // green
        case "good":
          return "#4ade80"; // light green
        case "fair":
          return "#f59e0b"; // amber
        case "poor":
          return "#f97373"; // red
        default:
          return "#9ca3af"; // gray-400
      }
    }

    return "#6b7280"; // gray when not in voice
  })();

  return (
    <>
      <Box
        sx={{
          width: "100%",
          borderRadius: "12px",
    backgroundColor: "var(--color-gray-900)", // ⬅️ was var(--color-bg-dark)
          border: "1px solid rgba(51,65,85,0.9)",
          px: 1.5,
          py: 1.1,
        }}
        className="flex flex-col gap-1.5" 
      >
        {/* TOP ROW – voice connection status */}
        {inVoiceContext && (
  <Box className="flex items-center justify-between text-[10px]">
    {/* Left: antenna + status + ping */}
    <Box
      // ⬇️ REMOVE this sx background override or set to 'transparent'
      // sx={{ backgroundColor: "var(--color-bg-dark)" }}
      className="
        inline-flex items-center gap-1
        rounded-full border border-slate-700/80
        px-2 py-[3px]
      "
    >
              <Signal
                className="h-3 w-3"
                style={{ color: qualityColor }}
              />
              <span
                className="uppercase tracking-[0.12em]"
                style={{ color: qualityColor }}
              >
                {statusText}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-300">
                {secondaryText}
              </span>
            </Box>

            {/* Right: leave voice */}
            {joinedChannelId && (
              <Tooltip title="Leave voice channel" arrow>
                <button
                  type="button"
                  onClick={handleLeaveVoice}
                  className="
                    inline-flex items-center gap-1
                    rounded-full px-2 py-[3px]
                    border border-red-500/70
                    bg-red-500/10
                    text-[10px] text-red-400
                    hover:bg-red-500/15 hover:border-red-400
                    transition-colors
                  "
                >
                  <PhoneOff className="h-3 w-3" />
                  <span className="uppercase tracking-[0.14em]">
                    Leave
                  </span>
                </button>
              </Tooltip>
            )}
          </Box>
        )}

        {/* BOTTOM ROW – user info + default controls */}
        <Box className="flex items-center gap-3">
          {/* Avatar + presence dot */}
          <Box className="relative">
            <Avatar
              src={user.avatarUrl || undefined}
              alt={user.name || user.email || "Profile"}
              sx={{
                width: 32,
                height: 32,
                bgcolor: "rgba(108,207,246,0.25)",
                color: "var(--color-primary-500)",
                fontSize: 13,
              }}
            >
              {!user.avatarUrl && initials}
            </Avatar>
            <span
              className="
                absolute -bottom-0.5 -right-0.5
                h-2.5 w-2.5 rounded-full
                bg-emerald-400
                ring-2 ring-[color:var(--color-gray-950)]
              "
            />
          </Box>

          {/* User text */}
          <Box className="flex-1 min-w-0">
            <Typography
              variant="body2"
              className="truncate leading-tight text-[13px]"
              sx={{ color: "var(--color-gray-50)" }}
            >
              {user.name || user.username || "No name set"}
            </Typography>
            <Typography
              variant="caption"
              className="truncate leading-tight text-[11px]"
              sx={{ color: "var(--color-gray-400)" }}
            >
              {user.username ? `@${user.username} • ${user.email}` : user.email}
            </Typography>
          </Box>

          {/* Default controls: mic, deafen, settings */}
          <Box className="flex items-center gap-1.5">
            {/* Mic */}
            <Tooltip title={micMuted ? "Unmute" : "Mute"} arrow>
              <IconButton
                size="small"
                onClick={toggleMicMuted}
                sx={{
                  p: 0.6,
                  borderRadius: "999px",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  border: micMuted
                    ? "1px solid rgba(248,113,113,0.7)"
                    : "1px solid rgba(148,163,184,0.35)",
                  "&:hover": {
                    backgroundColor: "rgba(30,64,175,0.35)",
                  },
                }}
              >
                {micMuted ? (
                  <MicOff className="h-4 w-4" color="#f97373" />
                ) : (
                  <Mic className="h-4 w-4" color="#e5e7eb" />
                )}
              </IconButton>
            </Tooltip>

            {/* Headphones / deafen */}
            <Tooltip title={deafened ? "Enable audio" : "Deafen"} arrow>
              <IconButton
                size="small"
                onClick={toggleDeafened}
                sx={{
                  p: 0.6,
                  borderRadius: "999px",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  border: deafened
                    ? "1px solid rgba(248,113,113,0.7)"
                    : "1px solid rgba(148,163,184,0.35)",
                  "&:hover": {
                    backgroundColor: "rgba(30,64,175,0.35)",
                  },
                }}
              >
                {deafened ? (
                  <HeadphoneOff className="h-4 w-4" color="#f97373" />
                ) : (
                  <Headphones className="h-4 w-4" color="#e5e7eb" />
                )}
              </IconButton>
            </Tooltip>

            {/* Settings */}
            <Tooltip title="Settings" arrow>
              <IconButton
                size="small"
                onClick={() => setSettingsOpen(true)}
                sx={{
                  p: 0.6,
                  borderRadius: "999px",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.35)",
                  "&:hover": {
                    backgroundColor: "rgba(30,64,175,0.35)",
                  },
                }}
              >
                <Settings className="h-4 w-4" color="#9ca3af" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
