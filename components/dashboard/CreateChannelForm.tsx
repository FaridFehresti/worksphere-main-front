"use client";

import { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Divider,
} from "@mui/material";
import { Hash, Mic2 } from "lucide-react";
import { createChannel } from "@/lib/api/channels";

type Props = {
  serverId: string | null;
  defaultType?: "TEXT" | "VOICE";
  onChannelCreated?: () => void;
};

export default function CreateChannelForm({
  serverId,
  defaultType = "VOICE",
  onChannelCreated,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"TEXT" | "VOICE">(defaultType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVoice = type === "VOICE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverId) return;
    setLoading(true);
    setError(null);

    try {
      await createChannel({ serverId, name: name.trim(), type });
      setName("");
      onChannelCreated?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create channel");
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
        {isVoice ? (
          <Mic2 className="h-3.5 w-3.5 text-primary-300" />
        ) : (
          <Hash className="h-3.5 w-3.5 text-primary-300" />
        )}
        <span className="uppercase tracking-[0.18em]">Create channel</span>
      </Box>

      <Divider className="border-white/10" />

      <TextField
        size="small"
        fullWidth
        label="Channel name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={!serverId || loading}
        InputLabelProps={{ className: "text-graybrand-200" }}
        InputProps={{
          className:
            "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
        }}
      />

      <TextField
        size="small"
        select
        fullWidth
        label="Channel type"
        value={type}
        onChange={(e) => setType(e.target.value as "TEXT" | "VOICE")}
        disabled={!serverId || loading}
        InputLabelProps={{ className: "text-graybrand-200" }}
        InputProps={{
          className:
            "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
        }}
      >
        <MenuItem value="TEXT">Text</MenuItem>
        <MenuItem value="VOICE">Voice</MenuItem>
      </TextField>

      {error && (
        <Typography className="text-xs text-red-400">{error}</Typography>
      )}

      <Box className="flex justify-end">
        <Button
          type="submit"
          size="small"
          disabled={!serverId || loading || !name.trim()}
          className="
            normal-case bg-primary-500 hover:bg-primary-400
            text-bglight text-xs px-3
          "
        >
          {loading ? "Creating…" : "Create"}
        </Button>
      </Box>
    </Box>
  );
}
