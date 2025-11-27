// app/dashboard/teams/[teamId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import TeamDetailPanel from "@/components/dashboard/TeamDetailPanel";

export default function TeamPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  if (!teamId) return null; // or a small loading state

  return <TeamDetailPanel teamId={teamId} />;
}
