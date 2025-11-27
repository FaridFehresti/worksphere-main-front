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
} from "lucide-react";
import { useUserStore } from "@/lib/store/user";
import { useAudioStore } from "@/lib/audio";
import { useLogout } from "@/lib/logout";
import SettingsDialog from "./SettingsDialog";

export default function UserStatusBar() {
  const user = useUserStore((s) => s.user);
  const micMuted = useAudioStore((s) => s.micMuted);
  const deafened = useAudioStore((s) => s.deafened);
  const toggleMicMuted = useAudioStore((s) => s.toggleMicMuted);
  const toggleDeafened = useAudioStore((s) => s.toggleDeafened);
  const logout = useLogout();

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

  return (
    <>
      <Box
        sx={{
          width: "100%",
          borderRadius: 2,
          backgroundColor: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(148,163,184,0.35)",
          px: 1.5,
          py: 1.25,
        }}
        className="flex items-center gap-2"
      >
        {/* Avatar + presence dot */}
        <Box className="relative">
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: "rgba(108,207,246,0.25)",
              color: "#6CCFF6",
              fontSize: 13,
            }}
          >
            {initials}
          </Avatar>
          <span
            className="
              absolute -bottom-0.5 -right-0.5
              h-2.5 w-2.5 rounded-full
              bg-emerald-400
              ring-2 ring-[#020617]
            "
          />
        </Box>

        {/* User text */}
        <Box className="flex-1 min-w-0">
          <Typography
            variant="body2"
            className="text-bglight truncate leading-tight text-[13px]"
          >
            {user.name || "No name set"}
          </Typography>
          <Typography
            variant="caption"
            className="text-graybrand-300 truncate leading-tight text-[11px]"
          >
            {user.email}
          </Typography>
        </Box>

        {/* Controls */}
        <Box className="flex items-center gap-1.5">
          {/* Mic */}
          <Tooltip title={micMuted ? "Unmute" : "Mute"} arrow>
            <IconButton
              size="small"
              onClick={toggleMicMuted}
              sx={{
                p: 0.5,
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "rgba(148,163,184,0.18)",
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
                p: 0.5,
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "rgba(148,163,184,0.18)",
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

          {/* Settings (opens modal) */}
          <Tooltip title="Settings" arrow>
            <IconButton
              size="small"
              onClick={() => setSettingsOpen(true)}
              sx={{
                p: 0.5,
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "rgba(148,163,184,0.18)",
                },
              }}
            >
              <Settings className="h-4 w-4" color="#9ca3af" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
