// components/dashboard/sidebar/TeamServersPanel.tsx
"use client";

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
} from "lucide-react";

import { Team } from "@/lib/api/teams";
import { Server as ServerType } from "@/lib/api/servers";
import { Channel } from "@/lib/api/channels";

// 🔊 voice + user
import { useVoiceChannel } from "@/lib/voice/useVoiceChannel";
import SpeakingAvatar from "@/components/voice/SpeakingAvatar";
import { useUserStore } from "@/lib/store/user";

type Props = {
  teams: Team[];
  activeTeamId: string | null;
  servers: ServerType[];
  loadingServers: boolean;
  channelsByServer: Record<string, Channel[]>;
  loadingChannelsByServer: Record<string, boolean>;
  onServerClick: (server: ServerType) => void;
  onChannelClick: (server: ServerType, channel: Channel) => void;
  onCreateServerClick: () => void;
  onOpenAddMember?: (team: Team) => void;
};

const initialsFromId = (value?: string) => {
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
}: Props) {
  const activeTeam = teams.find((t) => t.id === activeTeamId) || null;

  // 🔊 voice state (global-ish)
  const { joinedChannelId, peers, localStream } = useVoiceChannel();
  const currentUser = useUserStore((s) => s.user);

  // Debug if needed:
  // console.log("[TeamServersPanel VC]", {
  //   joinedChannelId,
  //   peersLen: peers.length,
  //   hasLocal: !!localStream,
  // });

  const serverSkeletons = Array.from({ length: 2 });
  const channelSkeletons = Array.from({ length: 3 });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        backgroundColor: "var(--color-gray-900)",
      }}
    >
      {/* Header toolbar */}
      <Box
        sx={{
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          minHeight: "44px",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {activeTeam ? (
            <>
              <Box
                sx={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  backgroundColor: "var(--color-gray-800)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-primary-300)",
                  flexShrink: 0,
                  fontSize: "11px",
                }}
              >
                {activeTeam.name.charAt(0).toUpperCase()}
              </Box>
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "var(--color-gray-100)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "160px",
                }}
              >
                {activeTeam.name}
              </Typography>
            </>
          ) : (
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--color-gray-500)",
              }}
            >
              Select a team to view servers
            </Typography>
          )}
        </Box>

        {activeTeam && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {onOpenAddMember && (
              <Tooltip title="Manage members">
                <IconButton
                  size="small"
                  onClick={() => onOpenAddMember(activeTeam)}
                  sx={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-gray-900)",
                    border: "1px solid rgba(148,163,184,0.4)",
                    color: "var(--color-gray-200)",
                    "&:hover": {
                      backgroundColor: "var(--color-gray-800)",
                      borderColor: "var(--color-primary-400)",
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
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
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

      {/* Body */}
      <Box
        sx={{
          padding: "8px 10px 10px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            borderRadius: "10px",
            border: "1px solid rgba(148,163,184,0.18)",
            backgroundColor: "var(--color-bg-dark)",
            padding: "8px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!activeTeam && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "var(--color-gray-500)",
              }}
            >
              Pick a team from the left rail to see its servers and channels.
            </Box>
          )}

          {activeTeam && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--color-gray-500)",
                  marginBottom: "6px",
                  paddingInline: "2px",
                }}
              >
                Servers
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  paddingRight: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {/* Skeleton servers */}
                {loadingServers && servers.length === 0 && (
                  <>
                    {serverSkeletons.map((_, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          borderRadius: "8px",
                          border: "1px solid rgba(148,163,184,0.16)",
                          backgroundColor: "var(--color-gray-900)",
                          padding: "7px 8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <Skeleton
                          variant="rectangular"
                          height={16}
                          sx={{
                            bgcolor: "var(--color-gray-800)",
                            borderRadius: "4px",
                          }}
                        />
                        <Box
                          sx={{
                            paddingLeft: "16px",
                            borderLeft:
                              "1px solid rgba(148,163,184,0.28)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {channelSkeletons.map((__, cIdx) => (
                            <Skeleton
                              key={cIdx}
                              variant="rectangular"
                              width="80%"
                              height={12}
                              sx={{
                                bgcolor: "var(--color-gray-800)",
                                borderRadius: "4px",
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </>
                )}

                {!loadingServers && servers.length === 0 && (
                  <Box
                    sx={{
                      fontSize: "11px",
                      color: "var(--color-gray-500)",
                      paddingInline: "2px",
                    }}
                  >
                    No servers yet. Create the first one for this team.
                  </Box>
                )}

                {/* Real servers */}
                {servers.map((server) => {
                  const serverChannels = channelsByServer[server.id] || [];
                  const loadingChannels = !!loadingChannelsByServer[server.id];
                  const showChannelSkeletons =
                    loadingChannels && serverChannels.length === 0;

                  return (
                    <Box
                      key={server.id}
                      sx={{
                        borderRadius: "8px",
                        border: "1px solid rgba(148,163,184,0.2)",
                        backgroundColor: "var(--color-gray-900)",
                        padding: "7px 8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        transition:
                          "border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
                        "&:hover": {
                          borderColor: "rgba(148,163,184,0.35)",
                          backgroundColor: "rgba(15,23,42,1)",
                          boxShadow: "0 8px 18px rgba(0,0,0,0.7)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      {/* Server row */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                        onClick={() => onServerClick(server)}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--color-gray-50)",
                          }}
                        >
                          <ServerIcon className="h-3.5 w-3.5 text-[color:var(--color-primary-300)]" />
                          <span>{server.name}</span>
                        </Box>
                        <span
                          style={{
                            textTransform: "uppercase",
                            fontSize: "9px",
                            color: "var(--color-gray-500)",
                          }}
                        >
                          {server.type.toLowerCase()}
                        </span>
                      </Box>

                      {/* Channels */}
                      <Box
                        sx={{
                          paddingLeft: "16px",
                          borderLeft:
                            "1px solid rgba(148,163,184,0.28)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                          paddingTop: "3px",
                        }}
                      >
                        {showChannelSkeletons &&
                          channelSkeletons.map((_, idx) => (
                            <Skeleton
                              key={idx}
                              variant="rectangular"
                              width="80%"
                              height={12}
                              sx={{
                                bgcolor: "var(--color-gray-800)",
                                borderRadius: "4px",
                              }}
                            />
                          ))}

                        {!showChannelSkeletons &&
                          !loadingChannels &&
                          serverChannels.length === 0 && (
                            <Box
                              sx={{
                                fontSize: "10px",
                                color: "var(--color-gray-600)",
                              }}
                            >
                              No channels yet.
                            </Box>
                          )}

                        {!showChannelSkeletons &&
                          serverChannels.map((channel) => {
                            const isVoice = channel.type === "VOICE";
                            const isJoined =
                              isVoice && joinedChannelId === channel.id;
                            const channelPeers = isJoined ? peers : [];

                            // ✅ Always count you when joined
                            const occupantCount = isJoined
                              ? 1 + channelPeers.length
                              : channelPeers.length;

                            return (
                              <Box
                                key={channel.id}
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  fontSize: "11px",
                                  padding: "3px 6px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  color: "var(--color-gray-100)",
                                  transition:
                                    "background-color 100ms ease, color 100ms ease",
                                  "&:hover": {
                                    backgroundColor:
                                      "rgba(15,23,42,0.9)",
                                  },
                                  backgroundColor: isJoined
                                    ? "rgba(15,23,42,0.95)"
                                    : undefined,
                                }}
                                onClick={() =>
                                  onChannelClick(server, channel)
                                }
                              >
                                {/* Channel row */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    {isVoice ? (
                                      <Volume2 className="h-3.5 w-3.5 text-[color:var(--color-primary-300)]" />
                                    ) : (
                                      <Hash className="h-3.5 w-3.5 text-[color:var(--color-primary-300)]" />
                                    )}
                                    <span>{channel.name}</span>
                                  </span>
                                  <span
                                    style={{
                                      textTransform: "uppercase",
                                      fontSize: "9px",
                                      color: "var(--color-gray-600)",
                                    }}
                                  >
                                    {channel.type.toLowerCase()}
                                  </span>
                                </Box>

                                {/* Occupants nested under joined voice channel */}
                                {isVoice && isJoined && (
                                  <Box
                                    sx={{
                                      marginTop: "4px",
                                      paddingLeft: "18px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "3px",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      {/* Local user (no playback) */}
                                      {currentUser && localStream && (
                                        <SpeakingAvatar
                                          stream={localStream}
                                          nameOrEmail={
                                            currentUser.name ||
                                            currentUser.email ||
                                            "You"
                                          }
                                          tooltipLabel="You"
                                          playAudio={false}
                                        />
                                      )}

                                      {/* Remote peers */}
                                      {channelPeers.map((peer) => {
                                        const label =
                                          peer.userId || peer.socketId;

                                        // If they have a stream -> full SpeakingAvatar
                                        if (peer.stream) {
                                          return (
                                            <SpeakingAvatar
                                              key={peer.socketId}
                                              stream={peer.stream}
                                              nameOrEmail={
                                                peer.userId || "Peer"
                                              }
                                              tooltipLabel={label}
                                              playAudio={true}
                                            />
                                          );
                                        }

                                        // If no stream yet (listener-only / negotiating),
                                        // show a fallback avatar so count matches visuals
                                        return (
                                          <Avatar
                                            key={peer.socketId}
                                            sx={{
                                              width: 22,
                                              height: 22,
                                              bgcolor:
                                                "rgba(148,163,184,0.25)",
                                              fontSize: 10,
                                            }}
                                            title={label}
                                          >
                                            {initialsFromId(label)}
                                          </Avatar>
                                        );
                                      })}

                                      <Typography
                                        sx={{
                                          fontSize: "10px",
                                          color:
                                            "var(--color-gray-400)",
                                          marginLeft: "4px",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {occupantCount} in channel
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
