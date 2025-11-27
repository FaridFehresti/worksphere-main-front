// components/dashboard/TeamDetailPanel.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Divider,
  Typography,
  CircularProgress,
  Avatar,
  Tooltip,
} from "@mui/material";
import { Users2, Server, Hash, Mic2 } from "lucide-react";

import {
  fetchMyTeams,
  fetchTeamMembers,
  Team,
  TeamMember,
} from "@/lib/api/teams";
import {
  fetchServersForTeam,
  Server as ServerType,
} from "@/lib/api/servers";
import {
  fetchChannelsForServer,
  Channel,
} from "@/lib/api/channels";

import CreateChannelForm from "./CreateChannelForm";
import { useUserStore } from "@/lib/store/user";

// 🔊 voice imports
import { useVoiceChannel } from "@/lib/voice/useVoiceChannel";
import RemoteAudio from "@/components/voice/RemoteAudio";

type Props = {
  teamId: string;
};

export default function TeamDetailPanel({ teamId }: Props) {
  const currentUser = useUserStore((s) => s.user);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // 🔊 level meters
  const [localLevel, setLocalLevel] = useState(0);
  const [peerLevels, setPeerLevels] = useState<Record<string, number>>({});

  // 🔊 voice hook
  const {
    joinedChannelId,
    peers,
    connecting,
    error,
    joinChannel,
    leaveChannel,
    outputVolume,
    localStream,
  } = useVoiceChannel();

  /* ------------ LOAD HELPERS ------------ */

  const loadTeamName = async () => {
    try {
      setLoadingTeam(true);
      const all = await fetchMyTeams();
      const t = all.find((x) => x.id === teamId) ?? null;
      setTeam(t);
    } catch (err) {
      console.error("Failed to load team", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const m = await fetchTeamMembers(teamId);
      setMembers(m);
    } catch (err) {
      console.error("Failed to load members", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadServers = async () => {
    try {
      setLoadingServers(true);
      const data = await fetchServersForTeam(teamId);
      setServers(data);
    } catch (err) {
      console.error("Failed to load servers", err);
    } finally {
      setLoadingServers(false);
    }
  };

  const loadChannels = async (serverId: string | null) => {
    if (!serverId) {
      setChannels([]);
      return;
    }
    try {
      setLoadingChannels(true);
      const data = await fetchChannelsForServer(serverId);
      setChannels(data);
    } catch (err) {
      console.error("Failed to load channels", err);
    } finally {
      setLoadingChannels(false);
    }
  };

  /* ------------ INITIAL LOAD ON TEAM CHANGE ------------ */

  useEffect(() => {
    setSelectedServerId(null);
    setChannels([]);
    loadTeamName();
    loadMembers();
    loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  /* ------------ PICK FIRST SERVER AUTOMATICALLY ------------ */

  useEffect(() => {
    if (!selectedServerId && servers.length > 0) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  /* ------------ LOAD CHANNELS WHEN SERVER CHANGES ------------ */

  useEffect(() => {
    loadChannels(selectedServerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServerId]);

  /* ------------ DERIVED DATA ------------ */

  const textChannels = channels.filter((c) => c.type === "TEXT");
  const voiceChannels = channels.filter((c) => c.type === "VOICE");

  const initialsFromMember = (m: TeamMember) => {
    const name = m.user.name || m.user.email;
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const currentUserInitials = () => {
    if (!currentUser) return "?";
    const name = currentUser.name || currentUser.email || "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const initials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return "?";
    const parts = nameOrEmail.split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  /* ------------ RENDER ------------ */

  return (
    <Box
      sx={{
        flex: 1,
        background: "radial-gradient(circle at top, #020617, #020617)",
      }}
      className="p-4 space-y-4"
    >
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-primary-300" />
          <Typography className="text-bglight uppercase tracking-[0.18em] text-xs">
            {loadingTeam ? "Loading team…" : team?.name || "Team"}
          </Typography>
        </Box>

        <Box className="flex items-center gap-2">
          {connecting && (
            <Typography className="text-[11px] text-graybrand-400">
              Connecting…
            </Typography>
          )}
          {error && (
            <Typography className="text-[11px] text-red-400">
              {error}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider className="border-white/10" />

      <Box
        className="
          grid gap-4
          xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]
        "
      >
        {/* Members column */}
        <Box
          className="
            rounded-2xl border border-white/10
            bg-black/25 p-3 space-y-3
          "
        >
          <Box className="flex items-center justify-between">
            <Typography className="text-[11px] text-graybrand-200 uppercase tracking-[0.18em]">
              Members
            </Typography>
            {loadingMembers && (
              <CircularProgress size={14} sx={{ color: "#38bdf8" }} />
            )}
          </Box>

          <Box className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {members.map((m) => (
              <Box
                key={m.id}
                className="
                  flex items-center justify-between gap-2
                  text-xs text-graybrand-100
                  rounded-xl px-2 py-1.5
                  bg-white/5
                "
              >
                <Box className="flex items-center gap-2">
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: "rgba(56,189,248,0.18)",
                      fontSize: 11,
                    }}
                  >
                    {initialsFromMember(m)}
                  </Avatar>
                  <Box className="flex flex-col">
                    <span>{m.user.name || m.user.email}</span>
                    <span className="text-[10px] text-graybrand-400">
                      {m.user.email}
                    </span>
                  </Box>
                </Box>
                {m.role && (
                  <span className="text-[10px] text-graybrand-400 uppercase">
                    {m.role.name}
                  </span>
                )}
              </Box>
            ))}
            {!loadingMembers && members.length === 0 && (
              <Typography className="text-[11px] text-graybrand-400">
                No members yet. Use “Add member” in the sidebar.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Servers + channels */}
        <Box className="space-y-3">
          {/* Servers */}
          <Box
            className="
              rounded-2xl border border-white/10
              bg-black/25 p-3 space-y-2
            "
          >
            <Box className="flex items-center justify-between">
              <Typography className="text-[11px] text-graybrand-200 uppercase tracking-[0.18em]">
                Servers
              </Typography>
              {loadingServers && (
                <CircularProgress size={14} sx={{ color: "#38bdf8" }} />
              )}
            </Box>

            <Box className="flex flex-wrap gap-2">
              {servers.map((server) => {
                const active = server.id === selectedServerId;
                const isVoiceServer = server.type === "VOICE";

                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => setSelectedServerId(server.id)}
                    className={`
                      flex items-center gap-2 text-[11px]
                      rounded-xl px-3 py-1.5
                      border transition
                      ${
                        active
                          ? "bg-primary-500/20 border-primary-400/80 text-bglight"
                          : "bg-white/5 border-transparent text-graybrand-200 hover:bg-white/10 hover:border-white/10"
                      }
                    `}
                  >
                    <Server className="h-3.5 w-3.5 text-primary-300" />
                    <span>{server.name}</span>
                    <span className="text-[9px] text-graybrand-400 uppercase">
                      {isVoiceServer ? "Voice" : "Text"}
                    </span>
                  </button>
                );
              })}
              {!loadingServers && servers.length === 0 && (
                <Typography className="text-[11px] text-graybrand-400">
                  No servers yet for this team.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Channels + create forms */}
          <Box
            className="
              rounded-2xl border border-white/10
              bg-black/20 p-3 space-y-3
            "
          >
            <Box className="flex items-center justify-between">
              <Typography className="text-[11px] text-graybrand-200 uppercase tracking-[0.18em]">
                Channels
              </Typography>
              {loadingChannels && selectedServerId && (
                <CircularProgress size={14} sx={{ color: "#38bdf8" }} />
              )}
            </Box>

            {!selectedServerId && servers.length > 0 && (
              <Typography className="text-[11px] text-graybrand-400 mb-1">
                Select a server above to see and create channels.
              </Typography>
            )}

            <Box className="grid gap-4 md:grid-cols-2">
              {/* Text channels */}
              <Box className="space-y-1.5">
                <Typography className="text-[10px] text-graybrand-400 uppercase tracking-[0.2em]">
                  Text Channels
                </Typography>
                <Box className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                  {textChannels.map((ch) => (
                    <Box
                      key={ch.id}
                      className="
                        flex items-center gap-2 text-xs text-graybrand-100
                        rounded-xl px-2 py-1.5 bg-white/5
                      "
                    >
                      <Hash className="h-3 w-3 text-primary-300" />
                      <span>{ch.name}</span>
                    </Box>
                  ))}
                  {!loadingChannels &&
                    selectedServerId &&
                    textChannels.length === 0 && (
                      <Typography className="text-[10px] text-graybrand-500">
                        No text channels yet.
                      </Typography>
                    )}
                </Box>
              </Box>

              {/* Voice channels */}
              <Box className="space-y-1.5">
                <Typography className="text-[10px] text-graybrand-400 uppercase tracking-[0.2em]">
                  Voice Channels
                </Typography>
                <Box className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {voiceChannels.map((ch) => {
                    const joined = joinedChannelId === ch.id;
                    const channelPeers = joined ? peers : [];

                    return (
                      <Box
                        key={ch.id}
                        className="
                          rounded-xl bg-white/5 px-2 py-1.5
                          space-y-1.5
                        "
                      >
                        {/* Join / leave */}
                        <button
                          type="button"
                          className="
                            w-full flex items-center justify-between gap-2
                            text-xs
                            hover:bg-white/10 rounded-lg px-1.5 py-1
                          "
                          onClick={() =>
                            joined ? leaveChannel() : joinChannel(ch.id)
                          }
                        >
                          <span className="flex items-center gap-2">
                            <Mic2 className="h-3 w-3 text-primary-300" />
                            <span>{ch.name}</span>
                          </span>
                          <span className="text-[9px] text-graybrand-400 uppercase">
                            {joined ? "Leave" : "Join"}
                          </span>
                        </button>

                        {/* Occupants */}
                        {joined && (
                          <Box className="flex flex-wrap gap-1 pl-1 items-center mt-1">
{currentUser && (
  <>
    <Avatar
      sx={{
        width: 22,
        height: 22,
        fontSize: 10,
        bgcolor: "rgba(56,189,248,0.25)",
        boxShadow:
          localLevel > 0.15
            ? "0 0 0 2px rgba(56,189,248,0.8), 0 0 12px rgba(56,189,248,0.9)"
            : "none",
      }}
    >
      {currentUserInitials()}
    </Avatar>

    {localStream && (
  <RemoteAudio
    stream={localStream}
    muted
    volume={0}
    onLevel={setLocalLevel}
  />
)}
  </>
)}

{channelPeers.map((peer) =>
  peer.stream ? (
    <Tooltip key={peer.socketId} title={peer.userId || peer.socketId}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <Avatar
          sx={{
            width: 22,
            height: 22,
            fontSize: 10,
            bgcolor: "rgba(56,189,248,0.15)",
            boxShadow:
              (peerLevels[peer.socketId] ?? 0) > 0.15
                ? "0 0 0 2px rgba(56,189,248,0.7), 0 0 10px rgba(56,189,248,0.8)"
                : "none",
          }}
        >
          {initials(peer.userId || "Peer")}
        </Avatar>
        <RemoteAudio
          stream={peer.stream}
          muted={false}
          volume={outputVolume}
          onLevel={(level) =>
            setPeerLevels((prev) => ({
              ...prev,
              [peer.socketId]: level,
            }))
          }
        />
      </span>
    </Tooltip>
  ) : null
)}


                            {/* Local mic analyser (muted so you don't hear yourself) */}
                           {localStream && (
  <RemoteAudio
    stream={localStream}
    muted
    volume={0}
    onLevel={setLocalLevel}
  />
)}

                            {/* Remote peers */}
                          {channelPeers.map((peer) => (
  <Tooltip
    key={peer.socketId}
    title={peer.userId || peer.socketId}
  >
    <Avatar
      sx={{
        width: 22,
        height: 22,
        bgcolor: "rgba(56,189,248,0.15)",
        fontSize: 10,
        boxShadow:
          (peerLevels[peer.socketId] ?? 0) > 0.15
            ? "0 0 0 2px rgba(56,189,248,0.7), 0 0 10px rgba(56,189,248,0.8)"
            : "none",
      }}
    >
      {initials(peer.userId || "Peer")}

      {peer.stream && (
        <RemoteAudio
          stream={peer.stream}
          muted={false}
          volume={1}  // 🔥 force full volume for now
          onLevel={(level) =>
            setPeerLevels((prev) => ({
              ...prev,
              [peer.socketId]: level,
            }))
          }
        />
      )}
    </Avatar>
  </Tooltip>
))}


                            <Typography className="text-[10px] text-graybrand-300 ml-1">
                              {1 + channelPeers.length} in channel
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                  {!loadingChannels &&
                    selectedServerId &&
                    voiceChannels.length === 0 && (
                      <Typography className="text-[10px] text-graybrand-500">
                        No voice channels yet.
                      </Typography>
                    )}
                </Box>
              </Box>
            </Box>

            {/* Create channels */}
            <Divider className="border-white/10" />
            <Box className="grid gap-3 md:grid-cols-2">
              <CreateChannelForm
                serverId={selectedServerId}
                defaultType="VOICE"
                onChannelCreated={() => {
                  if (selectedServerId) loadChannels(selectedServerId);
                }}
              />
              <CreateChannelForm
                serverId={selectedServerId}
                defaultType="TEXT"
                onChannelCreated={() => {
                  if (selectedServerId) loadChannels(selectedServerId);
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
