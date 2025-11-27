// components/dashboard/TeamVoiceDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Typography,
  CircularProgress,
  Avatar,
  Tooltip,
} from "@mui/material";
import { Users2, Server, Hash, Mic2, RefreshCw } from "lucide-react";

import { fetchMyTeams, Team } from "@/lib/api/teams";
import { fetchServersForTeam, Server as ServerType } from "@/lib/api/servers";
import {
  fetchChannelsForServer,
  Channel,
} from "@/lib/api/channels";

import AddMemberForm from "./AddMemberForm";
import CreateChannelForm from "./CreateChannelForm";
import { useVoiceChannel } from "@/lib/voice/useVoiceChannel";
import RemoteAudio from "@/components/voice/RemoteAudio";
import { useUserStore } from "@/lib/store/user";

export default function TeamVoiceDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const currentUser = useUserStore((s) => s.user);

  const {
    joinedChannelId,
    peers,
    connecting,
    error,
    joinChannel,
    leaveChannel,
    outputVolume,
  } = useVoiceChannel();

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const data = await fetchMyTeams();
      setTeams(data);
      if (!selectedTeamId && data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load teams", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadServers = async (teamId: string | null) => {
    if (!teamId) return;
    try {
      setLoadingServers(true);
      const data = await fetchServersForTeam(teamId);
      setServers(data);
      if (!selectedServerId && data.length > 0) {
        setSelectedServerId(data[0].id);
      }
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

  // initial load
  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setServers([]);
      setSelectedServerId(null);
      return;
    }
    setSelectedServerId(null);
    loadServers(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  // when server changes
  useEffect(() => {
    if (!selectedServerId) {
      setChannels([]);
      return;
    }
    loadChannels(selectedServerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServerId]);

  const voiceChannels = channels.filter((c) => c.type === "VOICE");
  const textChannels = channels.filter((c) => c.type === "TEXT");

  const initials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return "?";
    const parts = nameOrEmail.split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

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
            Teams & Voice
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
          <IconButton
            size="small"
            onClick={loadTeams}
            sx={{
              color: "rgba(148,163,184,0.9)",
              "&:hover": {
                color: "#e5e7eb",
                bgcolor: "rgba(15,23,42,0.6)",
              },
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </IconButton>
        </Box>
      </Box>

      <Divider className="border-white/10" />

      {/* Main grid: Teams | Servers | Channels / Forms */}
      <Box
        className="
          grid gap-4
          lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)]
        "
      >
        {/* Teams column */}
        <Box
          className="
            rounded-2xl border border-white/10
            bg-black/30 p-3 space-y-3
          "
        >
          <Box className="flex items-center justify-between">
            <Typography className="text-[11px] text-graybrand-200 uppercase tracking-[0.18em]">
              Teams
            </Typography>
            {loadingTeams && (
              <CircularProgress size={14} sx={{ color: "#38bdf8" }} />
            )}
          </Box>

          <Box className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
            {teams.map((team) => {
              const active = team.id === selectedTeamId;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`
                    w-full flex items-center justify-between
                    rounded-xl px-3 py-2 text-left text-xs
                    transition
                    ${
                      active
                        ? "bg-primary-500/15 border border-primary-400/70 text-bglight"
                        : "bg-white/5 border border-transparent text-graybrand-200 hover:bg-white/10 hover:border-white/10"
                    }
                  `}
                >
                  <span>{team.name}</span>
                </button>
              );
            })}
            {teams.length === 0 && !loadingTeams && (
              <Typography className="text-[11px] text-graybrand-400">
                No teams yet. Create one in the Teams page.
              </Typography>
            )}
          </Box>

          {/* Add member form for selected team */}
          <AddMemberForm
            teamId={selectedTeamId}
            onMemberAdded={() => {
              // Optional: refetch members in future
            }}
          />
        </Box>

        {/* Servers column */}
        <Box
          className="
            rounded-2xl border border-white/10
            bg-black/25 p-3 space-y-3
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

          <Box className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {servers.map((server) => {
              const active = server.id === selectedServerId;
              const isVoice = server.type === "VOICE";
              return (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => setSelectedServerId(server.id)}
                  className={`
                    w-full flex items-center justify-between gap-2
                    rounded-xl px-3 py-2 text-left text-xs
                    transition
                    ${
                      active
                        ? "bg-primary-500/15 border border-primary-400/70 text-bglight"
                        : "bg-white/5 border border-transparent text-graybrand-200 hover:bg-white/10 hover:border-white/10"
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-primary-300" />
                    <span>{server.name}</span>
                  </span>
                  <span className="text-[10px] text-graybrand-400 uppercase">
                    {isVoice ? "Voice" : "Text"}
                  </span>
                </button>
              );
            })}
            {servers.length === 0 && selectedTeamId && !loadingServers && (
              <Typography className="text-[11px] text-graybrand-400">
                No servers yet for this team.
              </Typography>
            )}
            {!selectedTeamId && (
              <Typography className="text-[11px] text-graybrand-400">
                Select a team to see its servers.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Channels + forms column */}
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

          <Box className="grid gap-3 md:grid-cols-2">
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
                {textChannels.length === 0 && selectedServerId && (
                  <Typography className="text-[10px] text-graybrand-500">
                    No text channels.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Voice channels */}
            <Box className="space-y-1.5">
              <Typography className="text-[10px] text-graybrand-400 uppercase tracking-[0.2em]">
                Voice Channels
              </Typography>
              <Box className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {voiceChannels.map((ch) => {
                  const joined = joinedChannelId === ch.id;

                  // peers in this channel (we only track current joined channel)
                  const channelPeers = joined ? peers : [];

                  return (
                    <Box
                      key={ch.id}
                      className="
                        rounded-xl bg-white/5 px-2 py-1.5
                        space-y-1.5
                      "
                    >
                      <button
  type="button"
  className="
    w-full flex items-center justify-between gap-2
    text-xs rounded-xl px-2 py-1.5
    bg-white/5 hover:bg-white/10
    text-graybrand-100
  "
  onClick={() => {
    console.log("[UI] voice button clicked", {
      channelId: ch.id,
      joined,
    });
    joined ? leaveChannel() : joinChannel(ch.id);
  }}
>
                        <span className="flex items-center gap-2">
                          <Mic2 className="h-3 w-3 text-primary-300" />
                          <span>{ch.name}</span>
                        </span>
                        <span className="text-[9px] text-graybrand-400 uppercase">
                          {joined ? "Leave" : "Join"}
                        </span>
                      </button>

                      {/* "Who is here" */}
                      {joined && (
                        <Box className="flex flex-wrap gap-1 pl-1 items-center">
                          {/* You */}
                          {currentUser && (
                            <Tooltip
                              title={currentUser.name || currentUser.email}
                            >
                              <Avatar
                                sx={{
                                  width: 22,
                                  height: 22,
                                  bgcolor: "rgba(56,189,248,0.25)",
                                  fontSize: 10,
                                }}
                              >
                                {initials(
                                  currentUser.name || currentUser.email || "You"
                                )}
                              </Avatar>
                            </Tooltip>
                          )}

                          {/* Peers */}
                          {channelPeers.map((peer) =>
                            peer.stream ? (
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
                                  }}
                                >
                                  {/* For now we just show "P" – later use user profile */}
                                  P
                                  <RemoteAudio
                                    stream={peer.stream}
                                    volume={outputVolume}
                                  />
                                </Avatar>
                              </Tooltip>
                            ) : (
                              <Tooltip
                                key={peer.socketId}
                                title={peer.userId || peer.socketId}
                              >
                                <Avatar
                                  sx={{
                                    width: 22,
                                    height: 22,
                                    bgcolor: "rgba(56,189,248,0.1)",
                                    fontSize: 10,
                                  }}
                                >
                                  P
                                </Avatar>
                              </Tooltip>
                            )
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
                {voiceChannels.length === 0 && selectedServerId && (
                  <Typography className="text-[10px] text-graybrand-500">
                    No voice channels.
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider className="border-white/10" />

          {/* Forms row */}
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
  );
}
