"use client";

import { useState, useEffect, useRef } from "react"; // ⬅ add useEffect + useRef
import {
  Box,
  Dialog,
  IconButton,   
  Typography,
  Divider,
  TextField,
  MenuItem,
  Slider,
  Button,
} from "@mui/material";
import { X, User, Mic2, Volume2, Video, Settings2 } from "lucide-react";
import { useUserStore } from "@/lib/store/user";
import { useAudioStore } from "@/lib/audio";

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

type TabId = "profile" | "audio-video";
const AUDIO_SETTINGS_KEY = "worksphere.audioSettings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "profile",
    label: "Profile",
    icon: <User className="h-4 w-4" />,
  },
  {
    id: "audio-video",
    label: "Audio & Video",
    icon: <Mic2 className="h-4 w-4" />,
  },
];

/** Reusable dark menu styling for all selects */
const selectMenuProps = {
  PaperProps: {
    sx: {
      mt: 0.5,
      backgroundColor: "rgba(15,23,42,0.98)",
      color: "#e5e7eb",
      borderRadius: 2,
      border: "1px solid rgba(148,163,184,0.45)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
      "& .MuiMenuItem-root": {
        fontSize: 13,
      },
      "& .MuiMenuItem-root.Mui-selected": {
        backgroundColor: "rgba(56,189,248,0.22)",
      },
      "& .MuiMenuItem-root:hover": {
        backgroundColor: "rgba(148,163,184,0.22)",
      },
    },
  },
};

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
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
            User settings
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "220px minmax(0,1fr)" },
          minHeight: 420,
        }}
      >
        {/* Left: vertical tabs */}
        <Box
          sx={{
            borderRight: {
              xs: "none",
              md: "1px solid rgba(148,163,184,0.25)",
            },
            borderBottom: {
              xs: "1px solid rgba(148,163,184,0.25)",
              md: "none",
            },
            bgcolor: "rgba(15,23,42,0.92)",
            p: 2,
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            gap: 1,
            overflowX: { xs: "auto", md: "visible" },
          }}
        >
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2
                  rounded-xl
                  px-3 py-2
                  text-left text-xs
                  whitespace-nowrap
                  transition
                  ${
                    active
                      ? "bg-primary-500/15 border border-primary-400/70 text-bglight"
                      : "bg-transparent border border-transparent text-graybrand-200 hover:bg-white/5 hover:border-white/10"
                  }
                `}
              >
                <span
                  className={active ? "text-primary-300" : "text-graybrand-300"}
                >
                  {tab.icon}
                </span>
                <span className="tracking-[0.18em] uppercase">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </Box>

        {/* Right: content */}
        <Box
          sx={{
            p: 3,
            bgcolor: "rgba(15,23,42,0.9)",
          }}
        >
          {activeTab === "profile" ? <ProfileSettings /> : <AudioVideoSettings />}
        </Box>
      </Box>
    </Dialog>
  );
}

/* ---------------- PROFILE TAB ---------------- */

function ProfileSettings() {
  const user = useUserStore((s) => s.user);

  return (
    <Box className="space-y-3">
      <Typography
        variant="subtitle1"
        className="text-bglight flex items-center gap-2"
      >
        <User className="h-4 w-4 text-primary-300" />
        Profile
      </Typography>

      <Typography
        variant="body2"
        className="text-graybrand-200 text-sm mb-1.5"
      >
        Manage how you appear in WorkSphere. These settings will be shared
        across teams and servers.
      </Typography>

      <Divider className="border-white/10 mb-2" />

      {/* Make it 2-column only on md+ to avoid cramped inputs */}
      <Box className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Full name"
          defaultValue={user?.name ?? ""}
          size="small"
          variant="outlined"
          fullWidth
          InputLabelProps={{ className: "text-graybrand-200" }}
          InputProps={{
            className:
              "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
          }}
        />
        <TextField
          label="Display name"
          placeholder="What should people call you?"
          size="small"
          variant="outlined"
          fullWidth
          InputLabelProps={{ className: "text-graybrand-200" }}
          InputProps={{
            className:
              "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
          }}
        />
      </Box>

      <TextField
        label="Status message"
        placeholder="In deep work, back in 2h…"
        size="small"
        variant="outlined"
        fullWidth
        sx={{ mt: 1 }}
        InputLabelProps={{ className: "text-graybrand-200" }}
        InputProps={{
          className:
            "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
        }}
      />

      <Box className="grid gap-4 md:grid-cols-2 mt-1">
        <TextField
          label="Timezone"
          select
          size="small"
          variant="outlined"
          fullWidth
          defaultValue="UTC"
          InputLabelProps={{ className: "text-graybrand-200" }}
          InputProps={{
            className:
              "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
          }}
          SelectProps={{
            MenuProps: selectMenuProps,
          }}
        >
          <MenuItem value="UTC">UTC</MenuItem>
          <MenuItem value="Europe/Berlin">Europe/Berlin</MenuItem>
          <MenuItem value="America/New_York">America/New_York</MenuItem>
          <MenuItem value="Asia/Tehran">Asia/Tehran</MenuItem>
        </TextField>
      </Box>

      <Box className="pt-3 flex justify-end gap-2">
        <Button
          size="small"
          variant="outlined"
          className="normal-case border-white/30 text-graybrand-100 hover:border-white/60"
        >
          Reset
        </Button>
        <Button
          size="small"
          variant="contained"
          className="normal-case bg-primary-500 hover:bg-primary-400 text-bglight"
        >
          Save changes
        </Button>
      </Box>
    </Box>
  );
}

/* ---------------- AUDIO & VIDEO TAB ---------------- */

function AudioVideoSettings() {
  const {
    inputDeviceId,
    outputDeviceId,
    videoDeviceId,
    inputVolume,
    outputVolume,
    setDevices,
    setVolumes,
  } = useAudioStore();

  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const [testingOutput, setTestingOutput] = useState(false);
  const [micMonitoring, setMicMonitoring] = useState(false); // live test on/off

  // Mic level (0-100)
  const [micLevel, setMicLevel] = useState(0);

  // refs for audio graph
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);

  /* -------- load persisted settings once on mount -------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as {
        inputDeviceId?: string | null;
        outputDeviceId?: string | null;
        videoDeviceId?: string | null;
        inputVolume?: number;
        outputVolume?: number;
      };

      setDevices({
        input: data.inputDeviceId ?? null,
        output: data.outputDeviceId ?? null,
        video: data.videoDeviceId ?? null,
      });

      setVolumes({
        input: data.inputVolume ?? inputVolume,
        output: data.outputVolume ?? outputVolume,
      });
    } catch (err) {
      console.error("Failed to load saved audio settings", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDevices, setVolumes]);

  /* -------- enumerate devices (mic / speakers / camera) -------- */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    let cancelled = false;

    const getDevices = async () => {
      try {
        // Request audio permission once so labels are visible
        const tmpStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        tmpStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const inputs = devices.filter((d) => d.kind === "audioinput");
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        const videos = devices.filter((d) => d.kind === "videoinput");

        setInputDevices(inputs);
        setOutputDevices(outputs);
        setVideoDevices(videos);

        // If nothing selected yet, pick defaults
        const nextInput = inputDeviceId ?? inputs[0]?.deviceId ?? null;
        const nextOutput = outputDeviceId ?? outputs[0]?.deviceId ?? null;
        const nextVideo = videoDeviceId ?? videos[0]?.deviceId ?? null;

        if (
          nextInput !== inputDeviceId ||
          nextOutput !== outputDeviceId ||
          nextVideo !== videoDeviceId
        ) {
          setDevices({
            input: nextInput,
            output: nextOutput,
            video: nextVideo,
          });
        }
      } catch (err) {
        console.error("Error enumerating devices", err);
      }
    };

    getDevices();

    return () => {
      cancelled = true;
    };
  }, [inputDeviceId, outputDeviceId, videoDeviceId, setDevices]);

  /* -------- if selected device doesn't exist anymore, fallback -------- */
  useEffect(() => {
    const inputExists =
      !inputDeviceId ||
      inputDevices.some((d) => d.deviceId === inputDeviceId);
    const outputExists =
      !outputDeviceId ||
      outputDevices.some((d) => d.deviceId === outputDeviceId);
    const videoExists =
      !videoDeviceId ||
      videoDevices.some((d) => d.deviceId === videoDeviceId);

    let nextInput = inputDeviceId;
    let nextOutput = outputDeviceId;
    let nextVideo = videoDeviceId;

    if (!inputExists) {
      nextInput = inputDevices[0]?.deviceId ?? null;
    }
    if (!outputExists) {
      nextOutput = outputDevices[0]?.deviceId ?? null;
    }
    if (!videoExists) {
      nextVideo = videoDevices[0]?.deviceId ?? null;
    }

    if (
      nextInput !== inputDeviceId ||
      nextOutput !== outputDeviceId ||
      nextVideo !== videoDeviceId
    ) {
      setDevices({
        input: nextInput,
        output: nextOutput,
        video: nextVideo,
      });
    }
  }, [
    inputDevices,
    outputDevices,
    videoDevices,
    inputDeviceId,
    outputDeviceId,
    videoDeviceId,
    setDevices,
  ]);

  /* -------- create mic level meter whenever inputDeviceId changes -------- */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    let cancelled = false;

    const setupMicLevel = async () => {
      try {
        // cleanup previous
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }
        sourceNodeRef.current = null;
        monitorGainRef.current = null;

        const constraints: MediaStreamConstraints = {
          audio: inputDeviceId
            ? { deviceId: { exact: inputDeviceId } }
            : true,
          video: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        source.connect(analyser);

        // If live monitoring was already enabled, re-create the chain
        if (micMonitoring) {
          const gain = audioContext.createGain();
          gain.gain.value =
            (inputVolume / 100) * (outputVolume / 100);
          monitorGainRef.current = gain;
          source.connect(gain);
          gain.connect(audioContext.destination);
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const tick = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteTimeDomainData(dataArray);

          // compute RMS
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / bufferLength); // 0..~1
          const level = Math.max(
            0,
            Math.min(100, Math.round(rms * 200)) // scale a bit
          );

          setMicLevel(level);
          rafRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (e) {
        console.error("Error setting up mic level meter", e);
        setMicLevel(0);
      }
    };

    setupMicLevel();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      sourceNodeRef.current = null;
      monitorGainRef.current = null;
    };
  }, [inputDeviceId, micMonitoring, inputVolume, outputVolume]);

  /* -------- live MIC MONITOR toggle -------- */
  useEffect(() => {
    const ctx = audioContextRef.current;
    const source = sourceNodeRef.current;

    if (!ctx || !source) return;

    if (micMonitoring && !monitorGainRef.current) {
      // start live monitor
      const gain = ctx.createGain();
      gain.gain.value = (inputVolume / 100) * (outputVolume / 100);
      monitorGainRef.current = gain;
      source.connect(gain);
      gain.connect(ctx.destination);
    }

    if (!micMonitoring && monitorGainRef.current) {
      // stop live monitor
      try {
        monitorGainRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting monitor gain", e);
      }
      monitorGainRef.current = null;
    }
  }, [micMonitoring]);

  /* -------- update gain when volumes change while monitoring -------- */
  useEffect(() => {
    if (micMonitoring && monitorGainRef.current) {
      monitorGainRef.current.gain.value =
        (inputVolume / 100) * (outputVolume / 100);
    }
  }, [micMonitoring, inputVolume, outputVolume]);

  const handleToggleMicMonitor = () => {
    if (!streamRef.current || !audioContextRef.current) {
      console.warn("No mic stream available for live test");
      return;
    }
    setMicMonitoring((prev) => !prev);
  };

  /* -------- TEST OUTPUT: play a simple tone (short beep) -------- */
  const handleTestOutput = async () => {
    try {
      setTestingOutput(true);

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.value = outputVolume / 100;

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      setTimeout(() => {
        osc.stop();
        ctx.close();
        setTestingOutput(false);
      }, 800);
    } catch (err) {
      console.error("Output test failed", err);
      setTestingOutput(false);
    }
  };

  /* -------- SAVE / RESET (persist to localStorage) -------- */
  const handleSaveAudioSettings = () => {
    if (typeof window === "undefined") return;

    const payload = {
      inputDeviceId,
      outputDeviceId,
      videoDeviceId,
      inputVolume,
      outputVolume,
    };

    try {
      window.localStorage.setItem(
        AUDIO_SETTINGS_KEY,
        JSON.stringify(payload)
      );
    } catch (err) {
      console.error("Failed to save audio settings", err);
    }
  };

  const handleResetAudioSettings = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) {
        // No saved settings: go to simple defaults
        setDevices({
          input: null,
          output: null,
          video: null,
        });
        setVolumes({
          input: 100,
          output: 100,
        });
        return;
      }

      const data = JSON.parse(raw) as {
        inputDeviceId?: string | null;
        outputDeviceId?: string | null;
        videoDeviceId?: string | null;
        inputVolume?: number;
        outputVolume?: number;
      };

      setDevices({
        input: data.inputDeviceId ?? null,
        output: data.outputDeviceId ?? null,
        video: data.videoDeviceId ?? null,
      });

      setVolumes({
        input: data.inputVolume ?? 100,
        output: data.outputVolume ?? 100,
      });
    } catch (err) {
      console.error("Failed to reset audio settings", err);
    }
  };

  /* ------------------- RENDER ------------------- */

  return (
    <Box className="space-y-4">
      <Typography
        variant="subtitle1"
        className="text-bglight flex items-center gap-2"
      >
        <Mic2 className="h-4 w-4 text-primary-300" />
        Audio & Video
      </Typography>

      <Typography
        variant="body2"
        className="text-graybrand-200 text-sm mb-1.5"
      >
        Choose your input and output devices and tune volumes before joining a
        voice channel.
      </Typography>

      <Divider className="border-white/10 mb-2" />

      {/* DEVICES ROW */}
      <Box
        className="
          grid gap-3
          md:grid-cols-3
          rounded-2xl border border-white/10 bg-black/20
          p-3
        "
      >
        {/* Input device */}
        <Box className="space-y-1.5">
          <Typography className="text-[11px] text-graybrand-300 uppercase tracking-[0.18em]">
            Input device
          </Typography>
          <TextField
            size="small"
            select
            fullWidth
            value={inputDeviceId ?? ""}
            onChange={(e) =>
              setDevices({
                input: e.target.value || null,
                output: outputDeviceId,
                video: videoDeviceId,
              })
            }
            InputProps={{
              className:
                "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
            }}
            SelectProps={{
              MenuProps: selectMenuProps,
            }}
          >
            {inputDevices.length === 0 && (
              <MenuItem disabled>No microphones found</MenuItem>
            )}
            {inputDevices.map((d) => (
              <MenuItem key={d.deviceId} value={d.deviceId}>
                {d.label || "Microphone"}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Output device */}
        <Box className="space-y-1.5">
          <Typography className="text-[11px] text-graybrand-300 uppercase tracking-[0.18em]">
            Output device
          </Typography>
          <TextField
            size="small"
            select
            fullWidth
            value={outputDeviceId ?? ""}
            onChange={(e) =>
              setDevices({
                input: inputDeviceId,
                output: e.target.value || null,
                video: videoDeviceId,
              })
            }
            InputProps={{
              className:
                "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
            }}
            SelectProps={{
              MenuProps: selectMenuProps,
            }}
          >
            {outputDevices.length === 0 && (
              <MenuItem disabled>No speakers / outputs found</MenuItem>
            )}
            {outputDevices.map((d) => (
              <MenuItem key={d.deviceId} value={d.deviceId}>
                {d.label || "Output device"}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Camera */}
        <Box className="space-y-1.5">
          <Typography className="text-[11px] text-graybrand-300 uppercase tracking-[0.18em]">
            Camera
          </Typography>
          <TextField
            size="small"
            select
            fullWidth
            value={videoDeviceId ?? ""}
            onChange={(e) =>
              setDevices({
                input: inputDeviceId,
                output: outputDeviceId,
                video: e.target.value || null,
              })
            }
            InputProps={{
              className:
                "text-bglight bg-white/5 rounded-xl [&_.MuiOutlinedInput-notchedOutline]:border-white/20",
            }}
            SelectProps={{
              MenuProps: selectMenuProps,
            }}
          >
            {videoDevices.length === 0 && (
              <MenuItem disabled>No cameras found</MenuItem>
            )}
            {videoDevices.map((d) => (
              <MenuItem key={d.deviceId} value={d.deviceId}>
                {d.label || "Camera"}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      {/* CAMERA PREVIEW PLACEHOLDER */}
      <Box
        className="
          rounded-2xl border border-white/10 bg-black/30
          flex items-center justify-center gap-2
          text-[11px] text-graybrand-300
          py-3
        "
      >
        <Video className="h-3.5 w-3.5 text-primary-300" />
        Preview coming soon
      </Box>

      {/* LEVELS & TESTS */}
      <Box className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] pt-1">
        {/* Mic volume + level meter + live test */}
        <Box
          className="
            space-y-1.5 rounded-2xl border border-white/10
            bg-black/20 p-3
          "
        >
          <Box className="flex items-center justify-between text-xs text-graybrand-200">
            <span className="uppercase tracking-[0.18em]">Mic volume</span>
            <span>{inputVolume}%</span>
          </Box>
          <Slider
            size="small"
            value={inputVolume}
            onChange={(_, v) =>
              setVolumes({
                input: v as number,
                output: outputVolume,
              })
            }
          />

          {/* live mic bar */}
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                height: 8,
                borderRadius: 9999,
                overflow: "hidden",
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(to right, rgba(15,23,42,0.9), rgba(15,23,42,0.9))",
              }}
            >
              <Box
                sx={{
                  width: `${micLevel}%`,
                  height: "100%",
                  transition: "width 80ms linear",
                  background:
                    "linear-gradient(90deg, #22c55e, #eab308, #ef4444)",
                }}
              />
            </Box>
            <Typography
              variant="caption"
              className="text-[10px] text-graybrand-300 mt-0.5 block"
            >
              Live input level
            </Typography>
          </Box>

          <Button
            size="small"
            onClick={handleToggleMicMonitor}
            startIcon={<Mic2 className="h-3 w-3" />}
            className="
              normal-case mt-2
              bg-white/5 hover:bg-white/10
              text-graybrand-50
            "
          >
            {micMonitoring ? "Stop live mic test" : "Start live mic test"}
          </Button>
        </Box>

        {/* Output volume + test */}
        <Box
          className="
            space-y-1.5 rounded-2xl border border-white/10
            bg-black/20 p-3
          "
        >
          <Box className="flex items-center justify-between text-xs text-graybrand-200">
            <span className="uppercase tracking-[0.18em]">Output volume</span>
            <span>{outputVolume}%</span>
          </Box>
          <Slider
            size="small"
            value={outputVolume}
            onChange={(_, v) =>
              setVolumes({
                input: inputVolume,
                output: v as number,
              })
            }
          />
          <Button
            size="small"
            onClick={handleTestOutput}
            startIcon={<Volume2 className="h-3 w-3" />}
            className="
              normal-case mt-2
              bg-white/5 hover:bg-white/10
              text-graybrand-50
            "
          >
            {testingOutput ? "Playing tone…" : "Test output"}
          </Button>
        </Box>
      </Box>

      <Box className="pt-2 flex justify-end gap-2">
        <Button
          size="small"
          variant="outlined"
          onClick={handleResetAudioSettings}
          className="normal-case border-white/30 text-graybrand-100 hover:border-white/60"
        >
          Reset
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSaveAudioSettings}
          className="normal-case bg-primary-500 hover:bg-primary-400 text-bglight"
        >
          Save changes
        </Button>
      </Box>
    </Box>
  );
}




