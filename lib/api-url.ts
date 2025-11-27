const BASE_URL: string =
  process.env.NEXT_APP_BASE_URL || "http://192.168.1.53:5000";

export const API_ENDPOINT = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    register: `${BASE_URL}/auth/register`,
    me: `${BASE_URL}/auth/me`,
  },

  teams: {
    base: `${BASE_URL}/teams`, // POST create, GET my teams
    byId: (teamId: string) => `${BASE_URL}/teams/${teamId}`,
    members: (teamId: string) => `${BASE_URL}/teams/${teamId}/members`,
  },

  servers: {
    base: `${BASE_URL}/servers`, // POST create
    byTeam: (teamId: string) => `${BASE_URL}/servers/team/${teamId}`,
  },

  channels: {
    base: `${BASE_URL}/channels`, // POST create
    byServer: (serverId: string) => `${BASE_URL}/channels/server/${serverId}`,
    // later for voice:
    joinVoice: (channelId: string) =>
      `${BASE_URL}/channels/${channelId}/voice/join`,
    leaveVoice: (channelId: string) =>
      `${BASE_URL}/channels/${channelId}/voice/leave`,
  },
};
