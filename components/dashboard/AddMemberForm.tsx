"use client";

import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { UserPlus2 } from "lucide-react";
import { addTeamMember } from "@/lib/api/teams";

type Props = {
  teamId: string | null;
  onMemberAdded?: () => void;
};

export default function AddMemberForm({ teamId, onMemberAdded }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await addTeamMember(teamId, email.trim());
      setSuccess("Member added");
      setEmail("");
      onMemberAdded?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="
        rounded-2xl border border-white/10 bg-black/30
        p-3 space-y-2
      "
    >
      <Box className="flex items-center gap-2 text-xs text-graybrand-200">
        <UserPlus2 className="h-3.5 w-3.5 text-primary-300" />
        <span className="uppercase tracking-[0.18em]">Add member</span>
      </Box>

      <TextField
        size="small"
        fullWidth
        label="Member email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={!teamId || loading}
        InputLabelProps={{ className: "text-graybrand-200" }}
        InputProps={{
          className:
            "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
        }}
      />

      {error && (
        <Typography className="text-xs text-red-400">{error}</Typography>
      )}
      {success && (
        <Typography className="text-xs text-emerald-400">{success}</Typography>
      )}

      <Box className="flex justify-end">
        <Button
          type="submit"
          size="small"
          disabled={!teamId || loading || !email.trim()}
          className="
            normal-case bg-primary-500 hover:bg-primary-400
            text-bglight text-xs px-3
          "
        >
          {loading ? "Adding…" : "Invite"}
        </Button>
      </Box>
    </Box>
  );
}
