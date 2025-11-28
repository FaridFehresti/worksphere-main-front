// components/voice/SpeakingAvatar.tsx
"use client";

import { Box, Avatar, Tooltip } from "@mui/material";
import RemoteAudio from "./RemoteAudio";
import { useAudioLevel } from "@/lib/voice/useAudioLevel";

type SpeakingAvatarProps = {
  stream: MediaStream | null;
  volume?: number; // 0..1 or 0..100
  nameOrEmail: string;
  tooltipLabel?: string;
  size?: number;
  /** If false, avatar still shows speaking ring but does NOT play audio */
  playAudio?: boolean;
};

const getInitials = (nameOrEmail: string) => {
  const s = (nameOrEmail || "U").trim();
  if (!s) return "U";
  const parts = s.split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function SpeakingAvatar({
  stream,
  volume = 100,
  nameOrEmail,
  tooltipLabel,
  size = 22,
  playAudio = true,   // 👈 default: play audio (for remote peers)
}: SpeakingAvatarProps) {
  const level = useAudioLevel(stream);
  const isSpeaking = level > 0.06;

  const initials = getInitials(nameOrEmail);
  const label = tooltipLabel ?? nameOrEmail;

  return (
    <Tooltip title={label}>
      <Box
        className={`
          relative inline-flex items-center justify-center
          rounded-full p-[2px] transition-all duration-150
          ${
            isSpeaking
              ? "ring-2 ring-primary-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]"
              : "ring-1 ring-white/10"
          }
        `}
      >
        <Avatar
          sx={{
            width: size,
            height: size,
            bgcolor: isSpeaking
              ? "rgba(56,189,248,0.35)"
              : "rgba(148,163,184,0.25)",
            fontSize: 10,
          }}
        >
          {initials}
        </Avatar>

        {/* 👇 Only play the audio if playAudio is true */}
        {playAudio && <RemoteAudio stream={stream} volume={volume} />}
      </Box>
    </Tooltip>
  );
}
