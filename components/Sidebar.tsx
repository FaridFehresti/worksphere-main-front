// components/Sidebar.tsx
"use client";

import { Box, Button, IconButton, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Users2, UserPlus2 } from "lucide-react";

import { useUserStore } from "@/lib/store/user";
import { useLogout } from "@/lib/logout";

import UserStatusBar from "./dashboard/UserStatusBar";
import CreateTeamDialog from "./dashboard/CreateTeamDialog";
import AddMemberDialog from "./dashboard/AddMemberDialog";
import { fetchMyTeams, Team } from "@/lib/api/teams";

export default function Sidebar() {
  const user = useUserStore((s) => s.user);
  const logout = useLogout();

  const router = useRouter();
  const pathname = usePathname();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberTeamName, setAddMemberTeamName] = useState<string | undefined>(
    undefined
  );

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const data = await fetchMyTeams();
      setTeams(data);
    } catch (err) {
      console.error("Failed to load teams", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleOpenAddMember = (team: Team) => {
    setAddMemberTeamId(team.id);
    setAddMemberTeamName(team.name);
    setAddMemberOpen(true);
  };

  const handleCloseAddMember = () => {
    setAddMemberOpen(false);
    setAddMemberTeamId(null);
    setAddMemberTeamName(undefined);
  };

  const isTeamActive = (teamId: string) =>
    pathname?.startsWith(`/dashboard/teams/${teamId}`);

  return (
    <>
      <Box
        sx={{
          width: 360,
          background: "rgba(0,16,17,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
        }}
        className="flex flex-col p-4"
      >
        {/* Top Section */}
        <Box className="space-y-4">
          <h1 className="text-bglight font-display tracking-[0.2em] uppercase text-sm">
            WorkSphere
          </h1>

          {/* Navigation header */}
          <Box className="space-y-2 text-graybrand-100 text-sm">
            <div
              className="hover:text-primary-300 cursor-pointer"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </div>

            {/* Teams section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="hover:text-primary-300 cursor-pointer">
                  Teams
                </span>
                {loadingTeams && (
                  <CircularProgress size={14} sx={{ color: "#38bdf8" }} />
                )}
              </div>

              {/* Teams list */}
              <Box className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                {teams.map((team) => {
                  const active = isTeamActive(team.id);
                  return (
                    <Box
                      key={team.id}
                      className={`
                        flex items-center justify-between gap-2
                        text-xs
                        rounded-xl px-2 py-1.5
                        cursor-pointer
                        transition
                        ${
                          active
                            ? "bg-primary-500/20 border border-primary-400/70 text-bglight"
                            : "bg-white/5 border border-transparent text-graybrand-100 hover:bg-white/10 hover:border-white/10"
                        }
                      `}
                      onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <Users2 className="h-3.5 w-3.5 text-primary-300" />
                        <span>{team.name}</span>
                      </span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddMember(team);
                        }}
                        sx={{
                          p: 0.5,
                          color: "rgba(148,163,184,0.9)",
                          "&:hover": {
                            color: "#e5e7eb",
                            bgcolor: "rgba(15,23,42,0.6)",
                          },
                        }}
                      >
                        <UserPlus2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </Box>
                  );
                })}
                {teams.length === 0 && !loadingTeams && (
                  <div className="text-[11px] text-graybrand-400">
                    No teams yet. Create one below.
                  </div>
                )}
              </Box>
            </div>

            <div className="hover:text-primary-300 cursor-pointer">
              Servers
            </div>
          </Box>

          {/* Create team CTA */}
          <Box className="pt-2">
            <Button
              size="small"
              fullWidth
              onClick={() => setCreateTeamOpen(true)}
              className="
                normal-case text-xs
                bg-primary-500/90 hover:bg-primary-400
                text-bglight rounded-xl
              "
            >
              + Create team
            </Button>
          </Box>
        </Box>

        {/* Bottom User Section */}
        <Box className="mt-auto pt-4">
          <UserStatusBar />
        </Box>
      </Box>

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onTeamCreated={() => {
          loadTeams();
        }}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addMemberOpen}
        onClose={handleCloseAddMember}
        teamId={addMemberTeamId}
        teamName={addMemberTeamName}
      />
    </>
  );
}
