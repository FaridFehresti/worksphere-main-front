// lib/api/teams.ts
"use client";

import apiClient from "../api-client";
import { API_ENDPOINT } from "../api-url";

export type Team = {
  id: string;
  name: string;
};

export type TeamMember = {
  id: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  role?: {
    id: string;
    name: string;
  } | null;
};

/* ---------------------------------------------------
   TEAMS API (Using API_ENDPOINT)
---------------------------------------------------- */

export async function fetchMyTeams(): Promise<Team[]> {
  const res = await apiClient.get(API_ENDPOINT.teams.base);
  return res.data;
}

export async function createTeam(name: string): Promise<Team> {
  const res = await apiClient.post(API_ENDPOINT.teams.base, { name });
  return res.data;
}

export async function addTeamMember(teamId: string, email: string) {
  const res = await apiClient.post(API_ENDPOINT.teams.members(teamId), {
    email,
  });
  return res.data;
}

export async function fetchTeamMembers(
  teamId: string
): Promise<TeamMember[]> {
  const res = await apiClient.get(API_ENDPOINT.teams.members(teamId));
  return res.data;
}
