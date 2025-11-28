// components/Sidebar.tsx
"use client";

import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useUserStore } from "@/lib/store/user";
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
  const user = useUserStore((s) => s.user);
  const logout = useLogout();

  const router = useRouter();
  const pathname = usePathname();

  // dialogs
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberTeamName, setAddMemberTeamName] = useState<
    string | undefined
  >(undefined);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createServerTeamId, setCreateServerTeamId] = useState<string | null>(
    null
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
    // /dashboard/teams/[teamId]/...
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
      `/dashboard/teams/${server.teamId}?serverId=${server.id}&channelId=${channel.id}`
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
      <Box
        sx={{
          width: 380,
          height: "100vh",
          backgroundColor: "var(--color-bg-dark)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left: Team rail */}
          <TeamRail
            teams={teams}
            activeTeamId={activeTeamId}
            loadingTeams={loadingTeams}
            onTeamClick={handleTeamClick}
            onCreateTeamClick={() => setCreateTeamOpen(true)}
          />

          {/* Right: Servers + channels */}
          <Box
            sx={{
              flex: 1,
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

            <Box sx={{ marginTop: "auto", padding: "8px 12px 10px" }}>
              <UserStatusBar />
            </Box>
          </Box>
        </Box>
      </Box>

      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onTeamCreated={() => {
          loadTeams();
        }}
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
