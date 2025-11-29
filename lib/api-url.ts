// lib/api/endpoints.ts
const BASE_URL: string =
  process.env.NEXT_APP_BASE_URL || "https://faridtech.org/api";

export const API_ENDPOINT = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    register: `${BASE_URL}/auth/register`,

    // full "me" payload (same shape as /users/me now)
    me: `${BASE_URL}/users/me`,

    // password reset flow
    forgotPassword: `${BASE_URL}/auth/forgot-password`,
    resetPassword: `${BASE_URL}/auth/reset-password`,
  },

  // user profile & avatar
  users: {
    // GET full profile (same shape as auth.me)
    me: `${BASE_URL}/users/me`,

    // PATCH profile (name, username, timezone, etc.)
    updateMe: `${BASE_URL}/users/me`,

    // POST multipart/form-data { file } – avatar upload
    uploadAvatar: `${BASE_URL}/users/me/avatar`,

    // 👇 NEW: fetch arbitrary user by id (for voice peers)
  byId: (id: string) => `${BASE_URL}/users/by-id/${id}`,  // NEW
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
