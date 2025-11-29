"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Skeleton,
  IconButton,
  Tooltip,
  Avatar,
} from "@mui/material";
import {
  Server as ServerIcon,
  Hash,
  Volume2,
  Users2,
  Plus,
  MicOff,
  HeadphoneOff,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Team } from "@/lib/api/teams";
import { Server as ServerType } from "@/lib/api/servers";
import { Channel } from "@/lib/api/channels";

import { useVoiceChannel } from "@/lib/voice/useVoiceChannel";
import SpeakingAvatar from "@/components/voice/SpeakingAvatar";
import { useUserStore } from "@/lib/store/user";
import { useAudioStore } from "@/lib/audio";

type Props = {
  teams: Team[];
  activeTeamId: string | null;
  servers: ServerType[];
  loadingServers: boolean;
  channelsByServer: Record<string, Channel[]>;
  loadingChannelsByServer: Record<string, boolean>;
  onServerClick: (server: ServerType) => void;
  onChannelClick?: (server: ServerType, channel: Channel) => void;
  onCreateServerClick: () => void;
  onOpenAddMember?: (team: Team) => void;
  onCreateChannelClick?: (server: ServerType) => void; // NEW (optional)
};

const initialsFromText = (value?: string) => {
  if (!value) return "?";
  const clean = value.trim();
  if (!clean) return "?";
  const parts = clean.split(" ");
  if (parts.length === 1) return clean.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function TeamServersPanel({
  teams,
  activeTeamId,
  servers,
  loadingServers,
  channelsByServer,
  loadingChannelsByServer,
  onServerClick,
  onChannelClick,
  onCreateServerClick,
  onOpenAddMember,
  onCreateChannelClick,
}: Props) {
  const activeTeam = teams.find((t) => t.id === activeTeamId) || null;

  const { joinedChannelId, peers, localStream, joinChannel, leaveChannel } =
    useVoiceChannel();

  const currentUser = useUserStore((s) => s.user);
  const { micMuted, deafened } = useAudioStore();

  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);

  const effectiveExpandedServerId = useMemo(() => {
    if (expandedServerId && servers.some((s) => s.id === expandedServerId)) {
      return expandedServerId;
    }
    return servers[0]?.id ?? null;
  }, [expandedServerId, servers]);

  const serverSkeletons = Array.from({ length: 3 });
  const channelSkeletons = Array.from({ length: 3 });

  const handleVoiceChannelClick = (channelId: string) => {
    const alreadyJoined = joinedChannelId === channelId;

    if (alreadyJoined) {
      leaveChannel();
      return;
    }

    if (joinedChannelId && joinedChannelId !== channelId) {
      const ok = window.confirm(
        "You’re currently connected to another voice channel.\n\nLeave the current channel and join this one?"
      );
      if (!ok) return;
    }

    joinChannel(channelId);
  };

  const renderVoiceOccupants = (channelId: string) => {
    const isJoined = joinedChannelId === channelId;
    if (!isJoined) return null;

    const channelPeers = peers;
    const hasLocal = !!currentUser;
    const occupantCount =
      (hasLocal ? 1 : 0) + (channelPeers ? channelPeers.length : 0);

    return (
      <Box
        component={motion.div}
        layout
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        sx={{
          mt: 0.5,
          pl: 3,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {/* Local user */}
        {currentUser && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              fontSize: 11,
            }}
          >
            {localStream ? (
              <SpeakingAvatar
                stream={localStream}
                nameOrEmail={currentUser.name || currentUser.email || "You"}
                tooltipLabel="You"
                playAudio={false}
                size={22}
              />
            ) : (
              <Avatar
                sx={{
                  width: 22,
                  height: 22,
                  bgcolor: "rgba(108,207,246,0.18)",
                  fontSize: 10,
                  color: "var(--color-primary-50)",
                }}
              >
                {initialsFromText(currentUser.name || currentUser.email || "U")}
              </Avatar>
            )}

            <span className="text-[11px] text-[color:var(--color-gray-50)] truncate">
              {currentUser.name || currentUser.username || "You"}
            </span>

            <Box
              sx={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {micMuted && (
                <MicOff className="h-3.5 w-3.5 text-[color:var(--color-gray-300)]" />
              )}
              {deafened && (
                <HeadphoneOff className="h-3.5 w-3.5 text-[color:var(--color-gray-300)]" />
              )}
            </Box>
          </Box>
        )}

        {/* Remote peers */}
        {channelPeers.map((peer) => {
          const label = peer.userId || "Member";

          if (peer.stream) {
            return (
              <Box
                key={peer.socketId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  fontSize: 11,
                }}
              >
                <SpeakingAvatar
                  stream={peer.stream}
                  nameOrEmail={label}
                  tooltipLabel={label}
                  playAudio
                  size={22}
                />
                <span className="text-[11px] text-[color:var(--color-gray-50)] truncate">
                  {label}
                </span>
                <Box
                  sx={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  {peer.micMuted && (
                    <MicOff className="h-3.5 w-3.5 text-[color:var(--color-gray-300)]" />
                  )}
                  {peer.deafened && (
                    <HeadphoneOff className="h-3.5 w-3.5 text-[color:var(--color-gray-300)]" />
                  )}
                </Box>
              </Box>
            );
          }

          return (
            <Box
              key={peer.socketId}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                fontSize: 11,
              }}
            >
              <Avatar
                sx={{
                  width: 22,
                  height: 22,
                  bgcolor: "rgba(95,97,106,0.6)",
                  fontSize: 10,
                  color: "var(--color-gray-50)",
                }}
              >
                {initialsFromText(label)}
              </Avatar>
              <span className="text-[11px] text-[color:var(--color-gray-50)] truncate">
                {label}
              </span>
              <Box
                sx={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {peer.micMuted && (
                  <MicOff className="h-3.5 w-3.5 text-[color:var(--color-gray-300)]" />
                )}
                {peer.deafened && (
                  <HeadphoneOff className="h-3.5 w-3.5 text-[color:var(--color-gray-300)]" />
                )}
              </Box>
            </Box>
          );
        })}

        <Typography
          sx={{
            fontSize: 10,
            color: "var(--color-gray-400)",
            mt: 0.1,
          }}
        >
          {occupantCount} in channel
        </Typography>
      </Box>
    );
  };

  // Small pill summary when server card is collapsed but user is in one of its channels
  const renderCollapsedVoiceSummary = (
    serverChannels: Channel[],
  ): React.ReactNode => {
    if (!joinedChannelId) return null;

    const voiceChannel = serverChannels.find(
      (c) => c.type === "VOICE" && c.id === joinedChannelId,
    );
    if (!voiceChannel) return null;

    const hasLocal = !!currentUser;
    const occupantCount = (hasLocal ? 1 : 0) + peers.length;

    const sampleNames: string[] = [];
    if (hasLocal) sampleNames.push("You");
    peers.slice(0, 2).forEach((p) => {
      sampleNames.push(p.userId || "Member");
    });

    let text = sampleNames.join(", ");
    const extra = occupantCount - sampleNames.length;
    if (extra > 0) text += ` +${extra}`;

    return (
      <span
        className="
          inline-flex items-center gap-1
          px-2 py-[2px]
          rounded-[999px]
          border
          text-[10px]
          bg-[rgba(12,148,136,0.14)]
          border-[rgba(34,197,94,0.7)]
          text-[color:var(--color-primary-50)]
        "
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent-500)]" />
        {text} in
        <span className="font-medium">#{voiceChannel.name}</span>
      </span>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        backgroundColor: "var(--color-bg-dark)",
      }}
    >
      {/* Top header bar */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: "1px solid rgba(15,23,42,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          minHeight: 46,
          flexShrink: 0,
          background:
            "linear-gradient(135deg, rgba(12,148,136,0.04), rgba(0,16,17,0.98))",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {activeTeam ? (
            <>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "10px",
                  background:
                    "radial-gradient(circle at 0% 0%, var(--color-primary-500), var(--color-bg-dark))",
                  border: "1px solid rgba(148,163,184,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-primary-50)",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {initialsFromText(activeTeam.name)}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: "var(--color-gray-50)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 170,
                  }}
                >
                  {activeTeam.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 10,
                    color: "var(--color-gray-300)",
                  }}
                >
                  Servers & channels
                </Typography>
              </Box>
            </>
          ) : (
            <Typography
              sx={{
                fontSize: 12,
                color: "var(--color-gray-400)",
              }}
            >
              Select a team to view servers
            </Typography>
          )}
        </Box>

        {activeTeam && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {onOpenAddMember && (
              <Tooltip title="Manage members">
                <IconButton
                  size="small"
                  onClick={() => onOpenAddMember(activeTeam)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "14px",
                    backgroundColor: "rgba(30,31,34,0.96)",
                    border: "1px solid var(--color-gray-700)",
                    color: "var(--color-gray-100)",
                    "&:hover": {
                      backgroundColor: "var(--color-gray-900)",
                      borderColor: "var(--color-primary-500)",
                    },
                  }}
                >
                  <Users2 className="h-3.5 w-3.5" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Create server">
              <IconButton
                size="small"
                onClick={onCreateServerClick}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "14px",
                  backgroundColor: "var(--color-primary-500)",
                  color: "var(--color-bg-dark)",
                  "&:hover": {
                    backgroundColor: "var(--color-primary-400)",
                  },
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Main panel */}
      <Box
        sx={{
          px: 1,
          py: 1,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            borderRadius: "14px",
            border: "1px solid rgba(55,65,81,0.9)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(108,207,246,0.06), rgba(0,16,17,1))",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            px: 1,
            py: 1,
          }}
        >
          {activeTeam && (
            <Typography
              sx={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--color-gray-400)",
                px: 0.5,
                mb: 0.5,
              }}
            >
              Team servers
            </Typography>
          )}

          {!activeTeam && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 12,
                color: "var(--color-gray-400)",
                px: 2,
              }}
            >
              Pick a team from the left rail to see its servers and channels.
            </Box>
          )}

          {activeTeam && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                pr: 0.5,
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
              }}
            >
              {loadingServers && servers.length === 0 && (
                <>
                  {serverSkeletons.map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        borderRadius: "12px",
                        border: "1px solid rgba(75,85,99,0.85)",
                        backgroundColor: "rgba(30,31,34,0.97)",
                        p: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.75,
                      }}
                    >
                      <Skeleton
                        variant="rectangular"
                        height={20}
                        sx={{
                          bgcolor: "var(--color-gray-800)",
                          borderRadius: "999px",
                        }}
                      />
                      <Skeleton
                        variant="rectangular"
                        height={14}
                        sx={{
                          bgcolor: "var(--color-gray-800)",
                          borderRadius: "8px",
                        }}
                      />
                    </Box>
                  ))}
                </>
              )}

              {!loadingServers && servers.length === 0 && (
                <Typography
                  sx={{
                    fontSize: 11,
                    color: "var(--color-gray-400)",
                    px: 0.5,
                    mt: 1,
                  }}
                >
                  No servers yet. Use the + button above to create the first
                  one.
                </Typography>
              )}

              {servers.map((server) => {
                const isExpanded = server.id === effectiveExpandedServerId;
                const serverChannels = channelsByServer[server.id] || [];
                const loadingChannels = !!loadingChannelsByServer[server.id];

                const voiceChannels = serverChannels.filter(
                  (c) => c.type === "VOICE",
                );
                const textChannels = serverChannels.filter(
                  (c) => c.type === "TEXT",
                );

                const collapsedVoiceSummary =
                  !isExpanded && renderCollapsedVoiceSummary(serverChannels);

                return (
                  <Box
                    key={server.id}
                    component={motion.div}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    sx={{
                      borderRadius: "12px",
                      border: isExpanded
                        ? "1px solid var(--color-primary-500)"
                        : "1px solid rgba(55,65,81,0.85)",
                      backgroundColor: "rgba(30,31,34,0.98)",
                      boxShadow: isExpanded
                        ? "0 10px 26px rgba(0,0,0,0.85)"
                        : "0 6px 20px rgba(0,0,0,0.7)",
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      position: "relative",
                    }}
                    whileHover={{
                      y: -1,
                      boxShadow: "0 10px 24px rgba(0,0,0,0.9)",
                    }}
                  >
                    {/* Accent bar */}
                    <Box
                      sx={{
                        position: "absolute",
                        left: -2,
                        top: 10,
                        bottom: 10,
                        width: 3,
                        borderRadius: "6px",
                        background: isExpanded
                          ? "linear-gradient(to bottom, var(--color-primary-500), var(--color-accent-500))"
                          : collapsedVoiceSummary
                          ? "linear-gradient(to bottom, var(--color-accent-500), var(--color-primary-500))"
                          : "transparent",
                      }}
                    />

                    {/* Header row */}
                    <Box
                      className="flex items-center justify-between gap-2"
                      sx={{
                        px: 1,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedServerId(isExpanded ? null : server.id);
                          onServerClick(server);
                        }}
                        className="
                          flex items-center gap-2 min-w-0
                          text-left
                          focus:outline-none
                        "
                      >
                        <span
                          className="
                            inline-flex items-center justify-center
                            h-7 w-7 rounded-[9px]
                          "
                          style={{
                            background:
                              "radial-gradient(circle at 0% 0%, rgba(108,207,246,0.55), rgba(30,31,34,1))",
                          }}
                        >
                          <ServerIcon className="h-3.5 w-3.5 text-[color:var(--color-primary-50)]" />
                        </span>
                        <Box className="min-w-0">
                          <div className="truncate text-[12px] text-[color:var(--color-gray-50)]">
                            {server.name}
                          </div>
                          <div className="text-[10px] uppercase text-[color:var(--color-gray-400)]">
                            {server.type.toLowerCase()}
                          </div>
                        </Box>
                      </button>

                      <Box className="flex items-center gap-1.5 flex-shrink-0">
                        {collapsedVoiceSummary && (
                          <div className="hidden xl:block">
                            {collapsedVoiceSummary}
                          </div>
                        )}

                        {onCreateChannelClick && (
                          <Tooltip title="Add channel">
                            <IconButton
                              size="small"
                              onClick={() => onCreateChannelClick(server)}
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "999px",
                                backgroundColor: "rgba(15,23,42,0.9)",
                                border:
                                  "1px solid rgba(148,163,184,0.55)",
                                color: "var(--color-primary-200)",
                                "&:hover": {
                                  backgroundColor: "rgba(15,23,42,1)",
                                  borderColor: "var(--color-primary-500)",
                                },
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedServerId(isExpanded ? null : server.id)
                          }
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "999px",
                            backgroundColor: "rgba(15,23,42,0.9)",
                            border: "1px solid rgba(75,85,99,0.9)",
                            color: "var(--color-gray-200)",
                            "&:hover": {
                              backgroundColor: "rgba(15,23,42,1)",
                            },
                          }}
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                              isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                          />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Collapsed voice pill for smaller widths */}
                    {collapsedVoiceSummary && (
                      <Box className="mt-1 px-2 xl:hidden">
                        {collapsedVoiceSummary}
                      </Box>
                    )}

                    {/* Channels (animated height) */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="channels"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <Box
                            sx={{
                              mt: 0.6,
                              borderRadius: "10px",
                              backgroundColor: "rgba(15,23,42,0.98)",
                              border: "1px solid rgba(55,65,81,0.9)",
                              p: 0.75,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.6,
                            }}
                          >
                            {/* Voice section */}
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.16em",
                                  color: "var(--color-gray-400)",
                                  mb: 0.25,
                                  px: 0.25,
                                }}
                              >
                                Voice
                              </Typography>

                              {loadingChannels && voiceChannels.length === 0 && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                    mt: 0.5,
                                  }}
                                >
                                  {channelSkeletons.map((_, idx) => (
                                    <Skeleton
                                      key={idx}
                                      variant="rectangular"
                                      height={20}
                                      sx={{
                                        bgcolor: "var(--color-gray-800)",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}

                              {!loadingChannels &&
                                voiceChannels.length === 0 && (
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      color: "var(--color-gray-500)",
                                      px: 0.25,
                                      mt: 0.25,
                                    }}
                                  >
                                    No voice channels yet.
                                  </Typography>
                                )}

                              {voiceChannels.map((channel) => {
                                const isJoined =
                                  joinedChannelId === channel.id;
                                const channelPeers = isJoined ? peers : [];
                                const hasLocal = !!currentUser;
                                const occupantCount =
                                  (hasLocal && isJoined ? 1 : 0) +
                                  (isJoined ? channelPeers.length : 0);

                                return (
                                  <Box
                                    key={channel.id}
                                    component={motion.div}
                                    layout
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.985 }}
                                    sx={{
                                      mt: 0.4,
                                      borderRadius: "8px",
                                      px: 0.6,
                                      py: 0.45,
                                      cursor: "pointer",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 0.25,
                                      border: isJoined
                                        ? "1px solid var(--color-primary-500)"
                                        : "1px solid rgba(55,65,81,0.9)",
                                      backgroundColor: isJoined
                                        ? "rgba(108,207,246,0.18)"
                                        : "rgba(15,23,42,0.96)",
                                    }}
                                    onClick={() =>
                                      handleVoiceChannelClick(channel.id)
                                    }
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 0.75,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.6,
                                          minWidth: 0,
                                        }}
                                      >
                                        <Volume2 className="h-3.5 w-3.5 text-[color:var(--color-primary-300)]" />
                                        <span className="truncate text-[11px] text-[color:var(--color-gray-50)]">
                                          {channel.name}
                                        </span>
                                      </Box>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {isJoined && (
                                          <span
                                            className="
                                              inline-flex items-center gap-1
                                              px-2 py-[1px]
                                              rounded-[999px]
                                              text-[10px]
                                              bg-[rgba(15,118,110,0.2)]
                                              text-[color:var(--color-primary-50)]
                                              border border-[rgba(45,212,191,0.7)]
                                            "
                                          >
                                            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent-500)]" />
                                            Connected
                                          </span>
                                        )}
                                        {occupantCount > 0 && (
                                          <span className="text-[10px] text-[color:var(--color-gray-200)]">
                                            {occupantCount} online
                                          </span>
                                        )}
                                      </Box>
                                    </Box>

                                    <AnimatePresence initial={false}>
                                      {isJoined && (
                                        <>{renderVoiceOccupants(channel.id)}</>
                                      )}
                                    </AnimatePresence>
                                  </Box>
                                );
                              })}
                            </Box>

                            {/* Text section */}
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.16em",
                                  color: "var(--color-gray-400)",
                                  mb: 0.25,
                                  px: 0.25,
                                }}
                              >
                                Text
                              </Typography>

                              {loadingChannels && textChannels.length === 0 && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                    mt: 0.5,
                                  }}
                                >
                                  {channelSkeletons.map((_, idx) => (
                                    <Skeleton
                                      key={idx}
                                      variant="rectangular"
                                      height={18}
                                      sx={{
                                        bgcolor: "var(--color-gray-800)",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}

                              {!loadingChannels &&
                                textChannels.length === 0 && (
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      color: "var(--color-gray-500)",
                                      px: 0.25,
                                      mt: 0.25,
                                    }}
                                  >
                                    No text channels yet.
                                  </Typography>
                                )}

                              {textChannels.map((channel) => (
                                <Box
                                  key={channel.id}
                                  component={motion.div}
                                  layout="position"
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.985 }}
                                  sx={{
                                    mt: 0.4,
                                    borderRadius: "8px",
                                    px: 0.6,
                                    py: 0.45,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 0.75,
                                    border:
                                      "1px solid rgba(55,65,81,0.9)",
                                    backgroundColor: "rgba(15,23,42,0.96)",
                                    "&:hover": {
                                      borderColor: "var(--color-primary-500)",
                                    },
                                  }}
                                  onClick={() =>
                                    onChannelClick &&
                                    onChannelClick(server, channel)
                                  }
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.6,
                                      minWidth: 0,
                                    }}
                                  >
                                    <Hash className="h-3.5 w-3.5 text-[color:var(--color-primary-300)]" />
                                    <span className="truncate text-[11px] text-[color:var(--color-gray-50)]">
                                      {channel.name}
                                    </span>
                                  </Box>
                                  <span className="text-[9px] uppercase text-[color:var(--color-gray-400)]">
                                    text
                                  </span>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
