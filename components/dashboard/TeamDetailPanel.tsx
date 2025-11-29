// components/dashboard/TeamDetailPanel.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Box, Typography, CircularProgress, Avatar } from "@mui/material";

import {
  fetchMyTeams,
  fetchTeamMembers,
  Team,
  TeamMember,
} from "@/lib/api/teams";
import { useUserStore } from "@/lib/store/user";
import TeamVoiceStrip from "./TeamVoiceStrip";
import TeamChatPanel from "./TeamChatPanel";

type Props = {
  teamId: string;
};

// Helpers to safely access optional fields that aren't in the TS type
const getUserUsername = (u: TeamMember["user"]): string | undefined => {
  return (u as any).username as string | undefined;
};

const getUserAvatarUrl = (u: TeamMember["user"]): string | undefined => {
  return (u as any).avatarUrl as string | undefined;
};

export default function TeamDetailPanel({ teamId }: Props) {
  const currentUser = useUserStore((s) => s.user);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

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

  useEffect(() => {
    void loadTeamName();
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  /* ------------ HELPERS ------------ */

  const initialsFromMember = (m: TeamMember) => {
    const username = getUserUsername(m.user);
    const display = m.user.name || username || m.user.email || "User";
    const parts = display.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const memberCount = members.length;

  const sortedMembers = useMemo(() => {
    if (!currentUser) return members;

    const getSortKey = (user: TeamMember["user"]) => {
      const username = getUserUsername(user);
      return (user.name || username || user.email || "") as string;
    };

    return [...members].sort((a, b) => {
      const aIsMe = a.user.id === currentUser.id;
      const bIsMe = b.user.id === currentUser.id;
      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;
      return getSortKey(a.user).localeCompare(getSortKey(b.user));
    });
  }, [members, currentUser]);

  /* ------------ RENDER ------------ */

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        height: "100%", // 👈 now fills the flex column from DashboardShell
        borderRadius: "18px",
        border: "1px solid rgba(15,23,42,0.9)",
        background:
          "radial-gradient(circle at top, rgba(12,148,136,0.12), var(--color-bg-dark))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
        padding: { xs: 2.25, md: 2.75, lg: 3 },
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: { xs: 2, md: 2.5, lg: 3 },
      }}
    >
      {/* LEFT: main team canvas */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          minHeight: 0,
        }}
      >
        <TeamVoiceStrip />

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <TeamChatPanel />
        </Box>
      </Box>

      {/* RIGHT: members column (sidebar-like) */}
      <Box
        sx={{
          width: { xs: "100%", lg: 280, xl: 320 },
          flexShrink: 0,
          borderRadius: "16px",
          border: "1px solid rgba(55,65,81,0.9)",
          backgroundColor: "var(--color-gray-900)",
          display: "flex",
          flexDirection: "column",
          px: 1.25,
          py: 1.25,
          maxHeight: { xs: 360, md: 420, lg: "none" },
        }}
      >
        {/* Members header row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography
              sx={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--color-gray-300)",
              }}
            >
              Members
            </Typography>

            {memberCount > 0 && (
              <Box
                sx={{
                  fontSize: 10,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "999px",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  color: "var(--color-gray-200)",
                  border: "1px solid rgba(75,85,99,0.9)",
                }}
              >
                {memberCount}
              </Box>
            )}
          </Box>

          {loadingMembers && (
            <CircularProgress
              size={16}
              sx={{ color: "var(--color-primary-400)" }}
            />
          )}
        </Box>

        {/* Members list */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            pr: 0.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {sortedMembers.map((m) => {
            const isMe = currentUser && m.user.id === currentUser.id;
            const avatarSrc = getUserAvatarUrl(m.user) || undefined;
            const username = getUserUsername(m.user);
            const displayName =
              m.user.name || username || m.user.email;
            const subline = username
              ? `@${username} • ${m.user.email}`
              : m.user.email;

            return (
              <Box
                key={m.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  borderRadius: "12px",
                  px: 1,
                  py: 0.65,
                  backgroundColor: isMe
                    ? "rgba(108,207,246,0.12)"
                    : "rgba(15,23,42,0.9)",
                  border: isMe
                    ? "1px solid var(--color-primary-500)"
                    : "1px solid rgba(55,65,81,0.9)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={avatarSrc}
                    alt={displayName || "Member"}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "999px",
                      bgcolor: "rgba(108,207,246,0.22)",
                      fontSize: 11,
                      color: "var(--color-primary-50)",
                    }}
                  >
                    {!avatarSrc && initialsFromMember(m)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "var(--color-gray-50)",
                        maxWidth: 160,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {displayName}
                      {isMe && (
                        <span
                          style={{
                            fontSize: 10,
                            marginLeft: 6,
                            color: "var(--color-primary-300)",
                          }}
                        >
                          · you
                        </span>
                      )}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "var(--color-gray-400)",
                        maxWidth: 180,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {subline}
                    </Typography>
                  </Box>
                </Box>

                {m.role && (
                  <Box
                    sx={{
                      ml: 0.5,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: "999px",
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(152,206,0,0.12)",
                      color: "var(--color-accent-300)",
                      border: "1px solid rgba(152,206,0,0.65)",
                    }}
                  >
                    {m.role.name}
                  </Box>
                )}
              </Box>
            );
          })}

          {!loadingMembers && members.length === 0 && (
            <Typography
              sx={{
                fontSize: 11,
                color: "var(--color-gray-400)",
                mt: 0.5,
              }}
            >
              No members yet. Use “Add member” in the sidebar.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
