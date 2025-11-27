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
} from "@mui/material";
import { X, UserPlus2 } from "lucide-react";
import { addTeamMember } from "@/lib/api/teams";

type Props = {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
  teamName?: string;
};

export default function AddMemberDialog({
  open,
  onClose,
  teamId,
  teamName,
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = () => {
    setEmail("");
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await addTeamMember(teamId, email.trim());
      setSuccess("Member added");
      setEmail("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
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
          <UserPlus2 className="h-4 w-4 text-primary-300" />
          <Typography
            variant="subtitle2"
            className="uppercase tracking-[0.18em] text-graybrand-100"
          >
            Add member
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
          className="space-y-3 text-sm"
        >
          <Typography className="text-graybrand-200 text-xs">
            Invite a teammate to{" "}
            <span className="text-primary-300 font-medium">
              {teamName || "this team"}
            </span>{" "}
            by email.
          </Typography>

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
            <Typography className="text-xs text-emerald-400">
              {success}
            </Typography>
          )}

          <Box className="pt-1 flex justify-end gap-2">
            <Button
              size="small"
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="normal-case border border-white/30 text-graybrand-100 hover:border-white/60"
            >
              Close
            </Button>
            <Button
              size="small"
              type="submit"
              disabled={!email.trim() || !teamId || loading}
              className="normal-case bg-primary-500 hover:bg-primary-400 text-bglight"
            >
              {loading ? "Adding…" : "Add member"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
