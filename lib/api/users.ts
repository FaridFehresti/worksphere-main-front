// lib/api/users.ts
"use client";

import apiClient from "@/lib/api-client";
import { API_ENDPOINT } from "@/lib/api-url";

/**
 * This matches the shape returned by your Nest `UsersService.userMeSelect`
 * and `/users/:id` / `/users/me`.
 */
export type User = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  memberships?: Array<{
    team: {
      id: string;
      name: string;
    };
    role: {
      id: string;
      name: string;
      permissions: string[];
    };
  }>;
};

/**
 * Fetch ANY user by id – used for voice peers.
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  if (!userId) return null;

  try {
    const res = await apiClient.get<User>(API_ENDPOINT.users.byId(userId));
    return res.data;
  } catch (err) {
    console.error("[api/users] fetchUserById failed for", userId, err);
    return null;
  }
}
