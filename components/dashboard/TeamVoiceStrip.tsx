// components/dashboard/TeamVoiceStrip.tsx
"use client";

import { useMemo, useEffect, useState } from "react";
import { Box, Typography, Avatar, Tooltip } from "@mui/material";
import { MicOff, HeadphoneOff } from "lucide-react";

import { useVoiceChannel } from "@/lib/voice/useVoiceChannel";
import { useUserStore } from "@/lib/store/user";
import { useAudioStore } from "@/lib/audio";
import VoiceRippleSphere from "./VoiceRippleSphere";
import { fetchUserById, type User } from "@/lib/api/users";

const initialsFromText = (value?: string | null) => {
  if (!value) return "?";
  const clean = value.trim();
  if (!clean) return "?";
  const parts = clean.split(" ");
  if (parts.length === 1) return clean.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Hook: convert a MediaStream into a 0–1 loudness level.
 * It's UI-only, doesn't need to be perfect.
 */
function useStreamLevel(stream?: MediaStream | null) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    let ctx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let frameId: number;

    try {
      const AC =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AC) {
        console.warn("[TeamVoiceStrip] AudioContext not available");
        return;
      }

      ctx = new AC();

      if (!ctx) {
        console.warn("[TeamVoiceStrip] Failed to create AudioContext instance");
        return;
      }

      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
    } catch (err) {
      console.warn("[TeamVoiceStrip] analyser init failed", err);
      return;
    }

    if (!analyser) {
      console.warn("[TeamVoiceStrip] analyser is null after init");
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length) / 128; // roughly 0–1
      const boosted = Math.min(1, rms * 2.2);

      // smooth
      setLevel((prev) => prev * 0.75 + boosted * 0.25);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      try {
        if (source) source.disconnect();
        if (analyser) analyser.disconnect();
        if (ctx) ctx.close();
      } catch {
        // ignore
      }
    };
  }, [stream]);

  return level;
}

type TileProps = {
  label: string;
  avatarUrl?: string | null;
  isSelf?: boolean;
  micMuted?: boolean;
  deafened?: boolean;
  stream?: MediaStream | null;
};

function VoiceParticipantTile({
  label,
  avatarUrl,
  isSelf,
  micMuted,
  deafened,
  stream,
}: TileProps) {
  const level = useStreamLevel(stream);

  const displayLabel = isSelf ? "You" : label;

  return (
    <Box
      sx={{
        width: 128,
        height: 152,
        borderRadius: "18px",
        border: "1px solid rgba(55,65,81,0.95)",
        background:
          "radial-gradient(circle at 0% 0%, rgba(108,207,246,0.16), rgba(15,23,42,0.98))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 14px 30px rgba(0,0,0,0.9)",
      }}
    >
      {/* Sphere area */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          backgroundColor: "rgba(0,16,17,1)",
        }}
      >
        <VoiceRippleSphere level={level} />
      </Box>

      {/* Tiny footer with avatar + name + mic/deafen */}
      <Box
        sx={{
          px: 0.75,
          py: 0.55,
          display: "flex",
          alignItems: "center",
          gap: 0.6,
          backgroundColor: "rgba(15,23,42,0.98)",
          borderTop: "1px solid rgba(31,41,55,0.9)",
        }}
      >
        <Avatar
          src={avatarUrl || undefined}
          sx={{
            width: 18,
            height: 18,
            borderRadius: "8px",
            bgcolor: "rgba(108,207,246,0.25)",
            fontSize: 10,
            color: "var(--color-primary-50)",
            flexShrink: 0,
          }}
        >
          {!avatarUrl && initialsFromText(label)}
        </Avatar>

        <Typography
          sx={{
            fontSize: 10,
            color: "var(--color-gray-100)",
            maxWidth: 80,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayLabel}
          {isSelf && (
            <span
              style={{
                fontSize: 9,
                marginLeft: 4,
                color: "var(--color-primary-300)",
              }}
            >
              · you
            </span>
          )}
        </Typography>

        <Box
          sx={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            color: "var(--color-gray-400)",
          }}
        >
          {micMuted && <MicOff className="h-3 w-3" />}
          {deafened && <HeadphoneOff className="h-3 w-3" />}
        </Box>
      </Box>
    </Box>
  );
}

// userId -> { user, loading, error }
type PeerProfileMap = Record<
  string,
  {
    loading: boolean;
    user?: User | null;
    error?: string;
  }
>;

/**
 * Our voice peer objects come from useVoiceChannel (VoicePeer).
 * Adjust this if your shape changes.
 */
const resolvePeerUserId = (peer: any): string | undefined => {
  return (
    peer.userId ||
    peer.user?.id ||
    peer.metadata?.userId ||
    undefined
  );
};

/**
 * Normalize whatever fetchUserById returns into a plain User object.
 * Handles:
 *  - User
 *  - { user: User }
 *  - { data: User }
 *  - { result: User }
 */
const extractUser = (raw: any): User | null => {
  if (!raw) return null;
  if (raw.id && raw.email) return raw as User;
  if (raw.user && raw.user.id) return raw.user as User;
  if (raw.data && raw.data.id) return raw.data as User;
  if (raw.result && raw.result.id) return raw.result as User;
  return null;
};

export default function TeamVoiceStrip() {
  const currentUser = useUserStore((s) => s.user);
  const { micMuted, deafened } = useAudioStore();
  const { joinedChannelId, peers, localStream } = useVoiceChannel();

  const inVoice = !!joinedChannelId;

  const [peerProfiles, setPeerProfiles] = useState<PeerProfileMap>({});

  // Fetch missing peer user profiles
  useEffect(() => {
  if (!inVoice) return;

  let cancelled = false;

  const userIds = Array.from(
    new Set(
      peers
        .map((p) => resolvePeerUserId(p))
        .filter((id): id is string => !!id && typeof id === "string"),
    ),
  );

  if (userIds.length === 0) return;

  userIds.forEach((userId) => {
    setPeerProfiles((prev) => {
      const existing = prev[userId];
      if (existing?.user || existing?.loading) {
        return prev;
      }
      return {
        ...prev,
        [userId]: { loading: true },
      };
    });

    fetchUserById(userId)
      .then((raw) => {
        if (cancelled) return;
        const user = extractUser(raw);
        console.log("[TeamVoiceStrip] fetched user", userId, user);

        setPeerProfiles((prev) => ({
          ...prev,
          [userId]: { loading: false, user },
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[TeamVoiceStrip] failed to fetch user", userId, err);
        setPeerProfiles((prev) => ({
          ...prev,
          [userId]: {
            loading: false,
            error: String(err),
          },
        }));
      });
  });

  return () => {
    cancelled = true;
  };
}, [inVoice, peers]);

  const participants: TileProps[] = useMemo(() => {
    const arr: TileProps[] = [];

    // Local user first
    if (currentUser) {
      arr.push({
        label:
          currentUser.name ||
          (currentUser as any).username ||
          currentUser.email ||
          "You",
        avatarUrl: (currentUser as any).avatarUrl,
        isSelf: true,
        micMuted,
        deafened,
        stream: localStream,
      });
    }

    // Remote peers
    peers.forEach((peer) => {
      const userId = resolvePeerUserId(peer);
      const profile =
        userId && peerProfiles[userId] ? peerProfiles[userId].user : undefined;

      const label =
        profile?.name ||
        (profile as any)?.username ||
        profile?.email ||
        userId ||
        "Unknown user";

      const avatarUrl =
        (profile as any)?.avatarUrl ??
        (profile as any)?.imageUrl ??
        null;

      arr.push({
        label,
        avatarUrl: avatarUrl ?? undefined,
        isSelf: false,
        micMuted: peer.micMuted,
        deafened: peer.deafened,
        stream: peer.stream,
      });
    });

    return arr;
  }, [currentUser, micMuted, deafened, peers, localStream, peerProfiles]);

  return (
    <Box
      sx={{
        borderRadius: "18px",
        border: "1px solid rgba(15,23,42,0.9)",
        background:
          "radial-gradient(circle at top, rgba(12,148,136,0.18), var(--color-bg-dark))",
        px: 1.5,
        py: 1.25,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minHeight: 180,
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--color-gray-300)",
            }}
          >
            Voice presence
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              color: "var(--color-gray-500)",
            }}
          >
            Each sphere ripples with that member&apos;s voice.
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: 10,
            color: "var(--color-gray-400)",
          }}
        >
          {inVoice ? `${participants.length} in call` : "No active call"}
        </Typography>
      </Box>

      {/* Grid of user spheres */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignContent: "flex-start",
        }}
      >
        {inVoice && participants.length > 0 ? (
          participants.map((p, idx) => (
            <Tooltip key={p.label + idx} title={p.label} arrow>
              <div>
                <VoiceParticipantTile {...p} />
              </div>
            </Tooltip>
          ))
        ) : (
          <Typography
            sx={{
              fontSize: 11,
              color: "var(--color-gray-400)",
              mt: 0.5,
            }}
          >
            Join a voice channel from the sidebar. Each member will appear here
            with a reactive sphere that shows their speaking activity.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
