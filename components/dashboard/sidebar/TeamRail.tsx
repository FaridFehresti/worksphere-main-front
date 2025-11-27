// components/dashboard/sidebar/TeamRail.tsx
"use client";

import {
  Box,
  IconButton,
  Tooltip,
  Avatar,
  Skeleton,
} from "@mui/material";
import { Plus } from "lucide-react";
import { Team } from "@/lib/api/teams";

type Props = {
  teams: Team[];
  activeTeamId: string | null;
  loadingTeams: boolean;
  onTeamClick: (teamId: string) => void;
  onCreateTeamClick: () => void;
};

export default function TeamRail({
  teams,
  activeTeamId,
  loadingTeams,
  onTeamClick,
  onCreateTeamClick,
}: Props) {
  const skeletonItems = Array.from({ length: 4 });

  return (
    <Box
      sx={{
        width: 68,
        backgroundColor: "var(--color-bg-dark)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "8px",
        paddingBottom: "8px",
        gap: "10px",
        flexShrink: 0,
      }}
    >
      {/* Brand chip */}
      <Box
        sx={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          backgroundColor: "var(--color-gray-900)",
          color: "var(--color-bg-light)",
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 14px rgba(0,0,0,0.7)",
        }}
      >
        WS
      </Box>

      {/* Teams list */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          overflowY: "auto",
          width: "100%",
          paddingTop: "4px",
          paddingBottom: "4px",
        }}
      >
        {loadingTeams &&
          skeletonItems.map((_, idx) => (
            <Skeleton
              key={idx}
              variant="circular"
              width={34}
              height={34}
              sx={{
                borderRadius: "10px",
                bgcolor: "rgba(15,23,42,0.85)",
              }}
            />
          ))}

        {!loadingTeams &&
          teams.map((team) => {
            const active = team.id === activeTeamId;
            const initial =
              (team.name?.trim()?.charAt(0)?.toUpperCase() || "?") as string;

            return (
              <Tooltip
                key={team.id}
                title={team.name}
                placement="right"
                arrow
              >
                <IconButton
                  onClick={() => onTeamClick(team.id)}
                  sx={{
                    padding: 0,
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    border: active
                      ? "2px solid var(--color-primary-400)"
                      : "1px solid rgba(148,163,184,0.45)",
                    backgroundColor: active
                      ? "rgba(20,123,160,0.5)"
                      : "var(--color-gray-900)",
                    boxShadow: active
                      ? "0 0 0 1px rgba(20,123,160,0.7)"
                      : "0 4px 10px rgba(0,0,0,0.5)",
                    transition:
                      "background-color 150ms ease, border-color 150ms ease, transform 120ms ease, box-shadow 120ms ease",
                    "&:hover": {
                      backgroundColor: "rgba(15,23,42,1)",
                      borderColor: "var(--color-primary-300)",
                      transform: "translateY(-1px)",
                      boxShadow: "0 8px 18px rgba(0,0,0,0.7)",
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "8px",
                      bgcolor: active
                        ? "var(--color-primary-500)"
                        : "var(--color-gray-800)",
                      color: active
                        ? "var(--color-bg-dark)"
                        : "var(--color-gray-50)",
                      fontSize: "12px",
                    }}
                  >
                    {initial}
                  </Avatar>
                </IconButton>
              </Tooltip>
            );
          })}

        {!loadingTeams && teams.length === 0 && (
          <Box
            sx={{
              fontSize: "10px",
              color: "var(--color-gray-500)",
              textAlign: "center",
              paddingInline: "4px",
            }}
          >
            No teams
          </Box>
        )}
      </Box>

      {/* Create team button */}
      <Tooltip title="Create team" placement="right" arrow>
        <IconButton
          onClick={onCreateTeamClick}
          sx={{
            width: "30px",
            height: "30px",
            borderRadius: "10px",
            backgroundColor: "rgba(15,23,42,0.95)",
            border: "1px dashed rgba(148,163,184,0.8)",
            color: "var(--color-gray-200)",
            transition:
              "background-color 150ms ease, border-color 150ms ease, transform 120ms ease, box-shadow 120ms ease",
            "&:hover": {
              backgroundColor: "rgba(15,23,42,1)",
              borderColor: "var(--color-primary-400)",
              color: "var(--color-primary-100)",
              transform: "translateY(-1px)",
              boxShadow: "0 6px 14px rgba(0,0,0,0.7)",
            },
          }}
        >
          <Plus className="h-4 w-4" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
