"use client";

import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLogout } from "@/lib/logout";

import { fetchMyTeams, Team } from "@/lib/api/teams";
import {
  fetchServersForTeam,
  Server as ServerType,
} from "@/lib/api/servers";
import {
  fetchChannelsForServer,
  Channel,
} from "@/lib/api/channels";

import TeamRail from "./TeamRail";
import TeamServersPanel from "./TeamServersPanel";
import UserStatusBar from "../UserStatusBar";
import CreateTeamDialog from "../CreateTeamDialog";
import AddMemberDialog from "../AddMemberDialog";
import CreateServerDialog from "../CreateServerDialog";

export default function Sidebar() {
  useCurrentUser();
  const logout = useLogout();

  const router = useRouter();
  const pathname = usePathname();

  // dialogs
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberTeamName, setAddMemberTeamName] = useState<string | undefined>(
    undefined,
  );
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createServerTeamId, setCreateServerTeamId] = useState<string | null>(
    null,
  );

  // data
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [serversByTeam, setServersByTeam] = useState<
    Record<string, ServerType[]>
  >({});
  const [loadingServersByTeam, setLoadingServersByTeam] = useState<
    Record<string, boolean>
  >({});

  const [channelsByServer, setChannelsByServer] = useState<
    Record<string, Channel[]>
  >({});
  const [loadingChannelsByServer, setLoadingChannelsByServer] = useState<
    Record<string, boolean>
  >({});

  // ---------- Helpers ----------

  const getActiveTeamIdFromPath = (): string | null => {
    if (!pathname) return null;
    const parts = pathname.split("/");
    if (parts[1] === "dashboard" && parts[2] === "teams" && parts[3]) {
      return parts[3];
    }
    return null;
  };

  const activeTeamId = getActiveTeamIdFromPath();

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

  const loadServersForTeam = async (teamId: string) => {
    try {
      setLoadingServersByTeam((prev) => ({ ...prev, [teamId]: true }));
      const data = await fetchServersForTeam(teamId);
      setServersByTeam((prev) => ({ ...prev, [teamId]: data }));
    } catch (err) {
      console.error("Failed to load servers for team", teamId, err);
    } finally {
      setLoadingServersByTeam((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  const loadChannelsForServer = async (serverId: string) => {
    try {
      setLoadingChannelsByServer((prev) => ({ ...prev, [serverId]: true }));
      const data = await fetchChannelsForServer(serverId);
      setChannelsByServer((prev) => ({ ...prev, [serverId]: data }));
    } catch (err) {
      console.error("Failed to load channels for server", serverId, err);
    } finally {
      setLoadingChannelsByServer((prev) => ({ ...prev, [serverId]: false }));
    }
  };

  // ---------- Effects ----------

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (activeTeamId) {
      loadServersForTeam(activeTeamId);
    }
  }, [activeTeamId]);

  useEffect(() => {
    if (!activeTeamId) return;
    const servers = serversByTeam[activeTeamId] || [];
    servers.forEach((server) => {
      if (!channelsByServer[server.id]) {
        loadChannelsForServer(server.id);
      }
    });
  }, [activeTeamId, serversByTeam]);

  // ---------- Handlers ----------

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

  const handleTeamClick = (teamId: string) => {
    router.push(`/dashboard/teams/${teamId}`);
  };

  const handleServerClick = (server: ServerType) => {
    router.push(`/dashboard/teams/${server.teamId}?serverId=${server.id}`);
  };

  const handleChannelClick = (server: ServerType, channel: Channel) => {
    router.push(
      `/dashboard/teams/${server.teamId}?serverId=${server.id}&channelId=${channel.id}`,
    );
  };

  const handleOpenCreateServer = () => {
    if (!activeTeamId) return;
    setCreateServerTeamId(activeTeamId);
    setCreateServerOpen(true);
  };

  const handleCloseCreateServer = () => {
    setCreateServerOpen(false);
    setCreateServerTeamId(null);
  };

  const activeTeamServers = activeTeamId ? serversByTeam[activeTeamId] || [] : [];
  const loadingActiveTeamServers = activeTeamId
    ? !!loadingServersByTeam[activeTeamId]
    : false;

  // ---------- Render ----------

  return (
    <>
      {/* Sidebar wrapper – responsive */}
      <Box
        sx={{
          width: { xs: "100%", lg: 420, xl: 460 }, // 👈 wider on desktop
          height: { xs: "auto", lg: "100vh" },
          maxHeight: { xs: "min(560px, 100vh)", lg: "100vh" },
          backgroundColor: "var(--color-bg-dark)",
          borderRight: {
            xs: "none",
            lg: "1px solid rgba(255,255,255,0.05)",
          },
          borderBottom: {
            xs: "1px solid rgba(255,255,255,0.05)",
            lg: "none",
          },
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Left: Team rail (slightly wider) */}
          <Box
            sx={{
              width: 76,
              flexShrink: 0,
            }}
          >
            <TeamRail
              teams={teams}
              activeTeamId={activeTeamId}
              loadingTeams={loadingTeams}
              onTeamClick={handleTeamClick}
              onCreateTeamClick={() => setCreateTeamOpen(true)}
            />
          </Box>

          {/* Right: servers + channels */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0, // 👈 prevents weird wrapping in server panel
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid rgba(255,255,255,0.03)",
              backgroundColor: "var(--color-gray-900)",
            }}
          >
            <TeamServersPanel
              teams={teams}
              activeTeamId={activeTeamId}
              servers={activeTeamServers}
              loadingServers={loadingActiveTeamServers}
              channelsByServer={channelsByServer}
              loadingChannelsByServer={loadingChannelsByServer}
              onServerClick={handleServerClick}
              onChannelClick={handleChannelClick}
              onCreateServerClick={handleOpenCreateServer}
              onOpenAddMember={handleOpenAddMember}
            />

            {/* User bar pinned to bottom */}
            <Box
              sx={{
                mt: "auto",
                px: 1.5,
                pb: 1.25,
                pt: 0.75,
                borderTop: "1px solid rgba(15,23,42,0.92)",
                backgroundColor: "var(--color-bg-dark)",
              }}
            >
              <UserStatusBar />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onTeamCreated={loadTeams}
      />
      <AddMemberDialog
        open={addMemberOpen}
        onClose={handleCloseAddMember}
        teamId={addMemberTeamId}
        teamName={addMemberTeamName}
      />
      <CreateServerDialog
        open={createServerOpen}
        onClose={handleCloseCreateServer}
        teamId={createServerTeamId}
        onServerCreated={() => {
          if (createServerTeamId) {
            loadServersForTeam(createServerTeamId);
          }
        }}
      />
    </>
  );
}
