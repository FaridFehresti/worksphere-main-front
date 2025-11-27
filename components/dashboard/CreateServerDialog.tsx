// components/dashboard/CreateServerDialog.tsx
"use client";

import { useState, FormEvent } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
  MenuItem,
} from "@mui/material";
import { X, ServerCog } from "lucide-react";
import { createServer } from "@/lib/api/servers";

type Props = {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
  onServerCreated?: () => void;
};

const SERVER_TYPES = [
  { value: "TEXT", label: "Text server" },
  { value: "VOICE", label: "Voice server" },
] as const;

export default function CreateServerDialog({
  open,
  onClose,
  teamId,
  onServerCreated,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"TEXT" | "VOICE">("TEXT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = () => {
    setName("");
    setType("TEXT");
    setLoading(false);
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createServer(teamId, {
        name: name.trim(),
        type,
      });

      setSuccess("Server created");
      onServerCreated?.();

      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to create server. Make sure you have permission."
      );
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
          <ServerCog className="h-4 w-4 text-primary-300" />
          <Typography
            variant="subtitle2"
            className="uppercase tracking-[0.18em] text-graybrand-100"
          >
            Create server
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
          <Box className="space-y-2">
            <Typography className="text-bglight text-sm">
              Server details
            </Typography>
            <Typography className="text-graybrand-300 text-xs">
              Servers live inside a team and contain your channels. Choose a
              name and type to get started.
            </Typography>

            <TextField
              size="small"
              fullWidth
              label="Server name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading || !teamId}
              InputLabelProps={{ className: "text-graybrand-200" }}
              InputProps={{
                className:
                  "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
              }}
            />

            <TextField
              select
              size="small"
              fullWidth
              label="Server type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as "TEXT" | "VOICE")
              }
              disabled={loading || !teamId}
              InputLabelProps={{ className: "text-graybrand-200" }}
              InputProps={{
                className:
                  "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
              }}
            >
              {SERVER_TYPES.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {error && (
            <Typography className="text-xs text-red-400">{error}</Typography>
          )}
          {success && (
            <Typography className="text-xs text-emerald-400">
              {success}
            </Typography>
          )}

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
              disabled={!name.trim() || loading || !teamId}
              className="normal-case bg-primary-500 hover:bg-primary-400 text-bglight"
            >
              {loading ? "Creating…" : "Create server"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
