// lib/api/teams.ts
"use client";

import apiClient from "../api-client";

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
};

export async function fetchMyTeams(): Promise<Team[]> {
  const res = await apiClient.get("/teams");
  return res.data;
}

export async function createTeam(name: string): Promise<Team> {
  const res = await apiClient.post("/teams", { name });
  return res.data;
}

export async function addTeamMember(teamId: string, email: string) {
  const res = await apiClient.post(`/teams/${teamId}/members`, { email });
  return res.data;
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const res = await apiClient.get(`/teams/${teamId}/members`);
  return res.data;
}
