    "use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import { X, Settings2, Users2, UserPlus2 } from "lucide-react";
import { createTeam, addTeamMember } from "@/lib/api/teams";

type Props = {
  open: boolean;
  onClose: () => void;
  onTeamCreated?: () => void; // optional callback for parent to refresh lists
};

export default function CreateTeamDialog({
  open,
  onClose,
  onTeamCreated,
}: Props) {
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = () => {
    setTeamName("");
    setInviteEmail("");
    setInvites([]);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleAddInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    if (invites.includes(email)) {
      setInviteEmail("");
      return;
    }
    setInvites((prev) => [...prev, email]);
    setInviteEmail("");
  };

  const handleRemoveInvite = (email: string) => {
    setInvites((prev) => prev.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1) create team
      const team = await createTeam(teamName.trim());

      // 2) add members (optional)
      if (invites.length > 0) {
        await Promise.all(
          invites.map((email) => addTeamMember(team.id, email))
        );
      }

      setSuccess("Team created");
      onTeamCreated?.();

      // small delay to show success then close
      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background:
            "radial-gradient(circle at top, rgba(15,23,42,0.95), rgba(2,6,23,0.98))",
          borderRadius: 3,
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.9)",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(148,163,184,0.35)",
          bgcolor: "rgba(15,23,42,0.8)",
        }}
      >
        <Box className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary-300" />
          <Typography
            variant="subtitle2"
            className="uppercase tracking-[0.18em] text-graybrand-100"
          >
            Create team
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            color: "rgba(148,163,184,0.9)",
            "&:hover": { color: "#e5e7eb", bgcolor: "rgba(15,23,42,0.6)" },
          }}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          p: 3,
          bgcolor: "rgba(15,23,42,0.9)",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          className="space-y-4 text-sm"
        >
          {/* Team info */}
          <Box className="space-y-2">
            <Typography className="text-bglight flex items-center gap-2 text-sm">
              <Users2 className="h-4 w-4 text-primary-300" />
              <span>Team details</span>
            </Typography>
            <Typography className="text-graybrand-300 text-xs">
              Create a new WorkSphere team. We’ll auto-generate basic servers
              and channels for you on the backend.
            </Typography>

            <TextField
              size="small"
              fullWidth
              label="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading}
              InputLabelProps={{ className: "text-graybrand-200" }}
              InputProps={{
                className:
                  "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
              }}
            />
          </Box>

          <Divider className="border-white/10" />

          {/* Invites */}
          <Box className="space-y-2">
            <Typography className="text-bglight flex items-center gap-2 text-sm">
              <UserPlus2 className="h-4 w-4 text-primary-300" />
              <span>Invite members (optional)</span>
            </Typography>
            <Typography className="text-graybrand-300 text-xs">
              Add teammate emails now, or skip and invite them later.
            </Typography>

            <Box className="flex gap-2">
              <TextField
                size="small"
                fullWidth
                label="Teammate email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInvite();
                  }
                }}
                InputLabelProps={{ className: "text-graybrand-200" }}
                InputProps={{
                  className:
                    "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
                }}
              />
              <Button
                type="button"
                size="small"
                disabled={!inviteEmail.trim() || loading}
                onClick={handleAddInvite}
                className="
                  normal-case text-xs px-3
                  bg-white/5 hover:bg-white/10
                  text-graybrand-50
                "
              >
                Add
              </Button>
            </Box>

            {invites.length > 0 && (
              <Box className="flex flex-wrap gap-1 pt-1">
                {invites.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => handleRemoveInvite(email)}
                    size="small"
                    sx={{
                      bgcolor: "rgba(15,23,42,0.9)",
                      color: "#e5e7eb",
                      border: "1px solid rgba(148,163,184,0.5)",
                      fontSize: 11,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Status */}
          {error && (
            <Typography className="text-xs text-red-400">{error}</Typography>
          )}
          {success && (
            <Typography className="text-xs text-emerald-400">
              {success}
            </Typography>
          )}

          {/* Actions */}
          <Box className="pt-2 flex justify-end gap-2">
            <Button
              size="small"
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="normal-case border border-white/30 text-graybrand-100 hover:border-white/60"
            >
              Cancel
            </Button>
            <Button
              size="small"
              type="submit"
              disabled={!teamName.trim() || loading}
              className="normal-case bg-primary-500 hover:bg-primary-400 text-bglight"
            >
              {loading ? "Creating…" : "Create team"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
