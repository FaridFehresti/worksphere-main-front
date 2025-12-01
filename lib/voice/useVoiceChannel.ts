// lib/voice/useVoiceChannel.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { getVoiceSocket } from "./voice-socket";
import { getToken } from "../auth-storage";
import { useAudioStore } from "@/lib/audio";

/* ------------------------------------------------------------------ */
/*  Module-level singletons (one per browser tab)                     */
/* ------------------------------------------------------------------ */

let socketSingleton: Socket | null = null;
let listenersAttached = false;

// All RTCPeerConnections keyed by remote socketId
const peerConnections = new Map<string, RTCPeerConnection>();

// ICE candidates queued until we have a remoteDescription
const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

// Local mic processed stream (what we send to peers + show in UI)
let myStream: MediaStream | null = null;

// Raw mic stream (direct from getUserMedia)
let rawMicStream: MediaStream | null = null;

// Web Audio pipeline for input volume control + gate
let micAudioContext: AudioContext | null = null;
let micGainNode: GainNode | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let micGateNode: ScriptProcessorNode | null = null;

// Internal amplitude threshold for gate (0–1 range)
let micGateThreshold = 0.03;

// Ping monitor
let pingIntervalId: number | null = null;

type SignalType = "offer" | "answer" | "ice-candidate";

type SignalEvent = {
  fromSocketId?: string; // incoming from server
  targetSocketId?: string; // outgoing to server
  type: SignalType;
  data: unknown;
};

type ChannelJoinedEvent = {
  channelId: string;
  existingPeers: string[];
};

type PeerJoinedEvent = {
  channelId: string;
  socketId: string;
  userId: string;
};

type PeerLeftEvent = {
  channelId: string;
  socketId: string;
};

type PeerAudioStateEvent = {
  socketId: string;
  micMuted: boolean;
  deafened: boolean;
};

export type VoicePeer = {
  socketId: string;
  userId?: string;
  stream?: MediaStream;
  micMuted?: boolean;
  deafened?: boolean;
};

/* ------------------------------------------------------------------ */
/*  GLOBAL VOICE STATE (shared across all components)                 */
/* ------------------------------------------------------------------ */

type VoiceState = {
  joinedChannelId: string | null;
  peers: Record<string, VoicePeer>;
  connecting: boolean;
  error: string | null;
  localStream: MediaStream | null;
  pingMs: number | null;
};

let voiceState: VoiceState = {
  joinedChannelId: null,
  peers: {},
  connecting: false,
  error: null,
  localStream: null,
  pingMs: null,
};

type Subscriber = (state: VoiceState) => void;
const subscribers = new Set<Subscriber>();

function notify(updater: (prev: VoiceState) => VoiceState) {
  voiceState = updater(voiceState);
  subscribers.forEach((fn) => fn(voiceState));
}

/* ------------------------------------------------------------------ */
/*  Ping monitor helpers (WebRTC getStats)                            */
/* ------------------------------------------------------------------ */

async function measurePingOnce() {
  if (!voiceState.joinedChannelId || peerConnections.size === 0) {
    // Not in a channel or no peers -> no ping
    notify((prev) => ({ ...prev, pingMs: null }));
    return;
  }

  // Take the first peer connection
  const firstEntry = peerConnections.values().next();
  if (firstEntry.done) {
    notify((prev) => ({ ...prev, pingMs: null }));
    return;
  }
  const pc = firstEntry.value as RTCPeerConnection;
  if (!pc) {
    notify((prev) => ({ ...prev, pingMs: null }));
    return;
  }

  try {
    const stats = await pc.getStats();
    let bestRttMs: number | null = null;

    stats.forEach((report: any) => {
      // candidate-pair is where currentRoundTripTime usually lives
      if (
        report.type === "candidate-pair" &&
        (report.selected || report.state === "succeeded") &&
        typeof report.currentRoundTripTime === "number"
      ) {
        const rttMs = report.currentRoundTripTime * 1000; // seconds -> ms
        if (bestRttMs == null || rttMs < bestRttMs) {
          bestRttMs = rttMs;
        }
      }

      // Fallback: remote-inbound-rtp.roundTripTime
      if (
        report.type === "remote-inbound-rtp" &&
        typeof report.roundTripTime === "number"
      ) {
        const rttMs = report.roundTripTime * 1000;
        if (bestRttMs == null || rttMs < bestRttMs) {
          bestRttMs = rttMs;
        }
      }
    });

    notify((prev) => ({
      ...prev,
      pingMs: bestRttMs ?? null,
    }));
  } catch (err) {
    console.warn("[voice-hook] ping measurement failed", err);
  }
}

function startPingMonitor() {
  if (typeof window === "undefined") return;
  if (pingIntervalId != null) return;

  console.log("[voice-hook] starting ping monitor");
  pingIntervalId = window.setInterval(() => {
    void measurePingOnce();
  }, 3000);
}

function stopPingMonitor() {
  if (pingIntervalId != null) {
    console.log("[voice-hook] stopping ping monitor");
    window.clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  notify((prev) => ({
    ...prev,
    pingMs: null,
  }));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useVoiceChannel() {
  console.log("[voice-hook] useVoiceChannel init");

  const {
    inputDeviceId,
    inputVolume,
    outputVolume,
    micMuted,
    deafened,
    inputThreshold,
  } = useAudioStore();

  // Local React state mirrors the global voiceState
  const [state, setState] = useState<VoiceState>(voiceState);

  // Subscribe this component to global voiceState
  useEffect(() => {
    subscribers.add(setState);
    setState(voiceState); // sync immediately

    return () => {
      subscribers.delete(setState);
    };
  }, []);

  /* ------------ threshold -> internal gate value ------------ */

  useEffect(() => {
    // Map 0–100 UI slider -> 0.005–0.1 amplitude range
    const ui = typeof inputThreshold === "number" ? inputThreshold : 30;
    const min = 0.005;
    const max = 0.1;
    micGateThreshold = min + (max - min) * (ui / 100);

    console.log("[voice-hook] updated mic gate threshold", {
      ui,
      micGateThreshold,
    });
  }, [inputThreshold]);

  /* ------------ helpers: local media ------------ */

  const stopLocalStream = useCallback(() => {
    console.log("[voice-hook] stopLocalStream");

    if (myStream) {
      myStream.getTracks().forEach((t) => t.stop());
      myStream = null;
    }

    if (rawMicStream) {
      rawMicStream.getTracks().forEach((t) => t.stop());
      rawMicStream = null;
    }

    if (micGateNode) {
      try {
        micGateNode.disconnect();
      } catch {
        // ignore
      }
      micGateNode.onaudioprocess = null;
      micGateNode = null;
    }

    if (micAudioContext) {
      micAudioContext.close().catch(() => {
        /* ignore */
      });
      micAudioContext = null;
    }

    micGainNode = null;
    micSourceNode = null;

    notify((prev) => ({
      ...prev,
      localStream: null,
    }));
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (voiceState.localStream) return voiceState.localStream;

    console.log("[voice-hook] ensureLocalStream: trying to acquire mic");

    const buildPipeline = async (
      constraints: MediaStreamConstraints,
    ): Promise<MediaStream | null> => {
      const raw = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[voice-hook] ensureLocalStream: got raw mic stream");
      rawMicStream = raw;

      const audioContext = new AudioContext();
      micAudioContext = audioContext;

      const source = audioContext.createMediaStreamSource(raw);
      micSourceNode = source;

      const gain = audioContext.createGain();
      micGainNode = gain;

      const dest = audioContext.createMediaStreamDestination();

      // 🔊 Noise gate using ScriptProcessorNode
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      micGateNode = processor;

      let gateGain = 0; // smoothed gate (0–1)
      let gateOpen = false;
      let loggedFirst = false;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const input = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);

        if (!loggedFirst) {
          console.log("[voice-hook] mic gate processor is running");
          loggedFirst = true;
        }

        // Compute RMS of this frame
        let sum = 0;
        for (let i = 0; i < input.length; i++) {
          const s = input[i];
          sum += s * s;
        }
        const rms = Math.sqrt(sum / input.length) || 0;

        // Hard overrides for debugging:
        // - if inputThreshold >= 95 -> always closed (mute)
        // - if inputThreshold <= 5  -> always open (no gate)
        let isAbove: boolean;
        if (inputThreshold >= 95) {
          isAbove = false;
        } else if (inputThreshold <= 5) {
          isAbove = true;
        } else {
          isAbove = rms >= micGateThreshold;
        }

        if (isAbove !== gateOpen) {
          gateOpen = isAbove;
          console.log(
            "[voice-hook] gate state change:",
            gateOpen ? "OPEN" : "CLOSED",
            "| rms=",
            rms.toFixed(4),
            "threshold=",
            micGateThreshold.toFixed(4),
            "ui=",
            inputThreshold,
          );
        }

        // Attack / release smoothing
        const attack = 0.4;
        const release = 0.1;
        const target = isAbove ? 1 : 0;
        const smoothing = isAbove ? attack : release;
        gateGain += (target - gateGain) * smoothing;

        // Extra hard gate: if gateGain very low, just output silence
        const effectiveGain = gateGain < 0.01 ? 0 : gateGain;

        for (let i = 0; i < input.length; i++) {
          output[i] = input[i] * effectiveGain;
        }
      };

      // Connect chain: source -> gate -> gain -> dest
      source.connect(processor);
      processor.connect(gain);
      gain.connect(dest);

      const vol = typeof inputVolume === "number" ? inputVolume : 100;
      const effective = micMuted ? 0 : vol;
      gain.gain.value = effective / 100;

      myStream = dest.stream;

      myStream.getAudioTracks().forEach((t) => {
        t.enabled = !micMuted;
      });

      notify((prev) => ({ ...prev, localStream: dest.stream }));

      console.log("[voice-hook] localStream ready with noise gate chain");
      return dest.stream;
    };

    try {
      if (inputDeviceId) {
        try {
          console.log(
            "[voice-hook] ensureLocalStream: using selected input device",
            inputDeviceId,
          );
          const stream = await buildPipeline({
            audio: {
              deviceId: { exact: inputDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
            },
            video: false,
          });
          return stream;
        } catch (err) {
          console.warn(
            "[voice-hook] ensureLocalStream: failed with selected device, err=",
            err,
          );
        }
      }

      console.log("[voice-hook] retrying getUserMedia with default device");
      const stream = await buildPipeline({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });
      console.log("[voice-hook] ensureLocalStream: got fallback stream");
      return stream;
    } catch (err) {
      console.warn(
        "[voice-hook] fallback getUserMedia failed, joining as listener only",
        err,
      );
      return null;
    }
  }, [inputDeviceId, inputVolume, micMuted, inputThreshold]);

  // When inputVolume or micMuted changes, update gain
  useEffect(() => {
    if (!micGainNode) return;
    const vol = typeof inputVolume === "number" ? inputVolume : 100;
    const effective = micMuted ? 0 : vol;
    micGainNode.gain.value = effective / 100;
    console.log(
      "[voice-hook] updated mic gain from inputVolume / micMuted:",
      vol,
      "muted?",
      micMuted,
    );
  }, [inputVolume, micMuted]);

  // Keep track.enabled in sync with micMuted as well
  useEffect(() => {
    if (!myStream) return;
    myStream.getAudioTracks().forEach((t) => {
      t.enabled = !micMuted;
    });
  }, [micMuted]);

  /* ------------ helpers: peers / PCs ------------ */

  const cleanupPeer = useCallback((socketId: string) => {
    console.log("[voice-hook] cleanupPeer", socketId);
    const pc = peerConnections.get(socketId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      try {
        pc.close();
      } catch {
        // ignore
      }
      peerConnections.delete(socketId);
    }

    notify((prev) => {
      const nextPeers = { ...prev.peers };
      delete nextPeers[socketId];
      return { ...prev, peers: nextPeers };
    });

    // If no more peers, we can stop ping monitor
    if (peerConnections.size === 0) {
      stopPingMonitor();
    }
  }, []);

  const leaveCurrentChannel = useCallback(() => {
    const socket = socketSingleton;
    console.log("[voice-hook] leaveCurrentChannel", voiceState.joinedChannelId);

    if (socket && voiceState.joinedChannelId) {
      socket.emit("leave-channel", { channelId: voiceState.joinedChannelId });
    }

    for (const peerId of peerConnections.keys()) {
      cleanupPeer(peerId);
    }
    peerConnections.clear();
    pendingCandidates.clear();
    stopLocalStream();
    stopPingMonitor();

    notify((prev) => ({
      ...prev,
      joinedChannelId: null,
      peers: {},
      connecting: false,
      pingMs: null,
    }));
  }, [cleanupPeer, stopLocalStream]);

  const createPeerConnection = useCallback(
    async (peerSocketId: string, isInitiator: boolean) => {
      const socket = socketSingleton;
      if (!socket) {
        console.warn("[voice-hook] no socket in createPeerConnection");
        return;
      }

      await ensureLocalStream();

      console.log(
        "[voice-hook] creating RTCPeerConnection for",
        peerSocketId,
        "initiator:",
        isInitiator,
      );

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:91.212.174.166:3478",
          },
          {
            urls: "turn:91.212.174.166:3478?transport=udp",
            username: "turnuser",
            credential: "turnpassword",
          },
        ],
      });

      pc.oniceconnectionstatechange = () => {
        console.log(
          "[webrtc] iceConnectionState for",
          peerSocketId,
          "=>",
          pc.iceConnectionState,
        );
      };

      if (myStream) {
        myStream.getTracks().forEach((track) => {
          pc.addTrack(track, myStream!);
        });
        console.log(
          "[voice-hook] added tracks from myStream to RTCPeerConnection",
        );
      } else if (isInitiator) {
        console.log(
          "[voice-hook] no local stream, adding recvonly audio transceiver",
        );
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("signal", {
            targetSocketId: peerSocketId,
            type: "ice-candidate",
            data: event.candidate,
          } as SignalEvent);
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        console.log("[voice-hook] got remote track for", peerSocketId);

        notify((prev) => ({
          ...prev,
          peers: {
            ...prev.peers,
            [peerSocketId]: {
              ...(prev.peers[peerSocketId] ?? { socketId: peerSocketId }),
              stream: remoteStream,
            },
          },
        }));
      };

      peerConnections.set(peerSocketId, pc);

      notify((prev) => ({
        ...prev,
        peers: {
          ...prev.peers,
          [peerSocketId]:
            prev.peers[peerSocketId] ?? { socketId: peerSocketId },
        },
      }));

      // Once we have at least one peer connection and are in a channel, start ping monitor
      if (voiceState.joinedChannelId) {
        startPingMonitor();
      }

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("signal", {
          targetSocketId: peerSocketId,
          type: "offer",
          data: offer,
        } as SignalEvent);
      }

      return pc;
    },
    [ensureLocalStream],
  );

  /* ------------ ensure & connect socket ------------ */

  const ensureSocket = useCallback((): Socket | null => {
    if (typeof window === "undefined") return null;

    if (!socketSingleton) {
      console.log("[voice-hook] creating voice socket");
      socketSingleton = getVoiceSocket();
    }

    const socket = socketSingleton;

    const token = getToken();
    if (token) {
      (socket as any).auth = { token };
    } else {
      console.warn("[voice-hook] no token in ensureSocket");
    }

    if (!socket.connected) {
      console.log("[voice-hook] connecting voice socket");
      socket.connect();
    }

    // Attach listeners only once – they update GLOBAL voiceState
    if (!listenersAttached) {
      listenersAttached = true;

      socket.on("connect", () => {
        console.log("[voice] socket connected", socket.id);
      });

      socket.on("disconnect", (reason) => {
        console.log("[voice] socket disconnected", reason);
        // When global socket drops, we effectively lose voice channel
        stopPingMonitor();
        notify((prev) => ({
          ...prev,
          joinedChannelId: null,
          connecting: false,
          pingMs: null,
        }));
      });

      socket.on("connect_error", (err) => {
        console.error("[voice] connect_error", err);
        stopPingMonitor();
        notify((prev) => ({
          ...prev,
          error: err.message || "Voice connection failed",
          connecting: false,
          joinedChannelId: null,
          pingMs: null,
        }));
      });

      socket.on("channel-joined", async (event: ChannelJoinedEvent) => {
        console.log("[voice] channel-joined", event);

        notify((prev) => ({
          ...prev,
          joinedChannelId: event.channelId,
          connecting: false,
          error: null,
        }));

        // Start ping monitor once we are in a channel
        startPingMonitor();

        for (const peerId of event.existingPeers) {
          await createPeerConnection(peerId, true);
        }
      });

      socket.on("peer-joined", async (event: PeerJoinedEvent) => {
        console.log("[voice] peer-joined", event);

        const { channelId, socketId, userId } = event;

        if (
          !voiceState.joinedChannelId ||
          voiceState.joinedChannelId !== channelId
        ) {
          return;
        }

        notify((prev) => ({
          ...prev,
          peers: {
            ...prev.peers,
            [socketId]: {
              ...(prev.peers[socketId] ?? { socketId }),
              userId,
            },
          },
        }));

        if (!peerConnections.get(socketId)) {
          await createPeerConnection(socketId, false);
        }
      });

      socket.on("peer-left", (event: PeerLeftEvent) => {
        console.log("[voice] peer-left", event);
        cleanupPeer(event.socketId);
      });

      // 🔊 peer audio state updates
      socket.on("peer-audio-state", (event: PeerAudioStateEvent) => {
        console.log("[voice] peer-audio-state", event);
        const { socketId, micMuted, deafened } = event;

        notify((prev) => ({
          ...prev,
          peers: {
            ...prev.peers,
            [socketId]: {
              ...(prev.peers[socketId] ?? { socketId }),
              micMuted,
              deafened,
            },
          },
        }));
      });

      socket.on("signal", async ({ fromSocketId, type, data }: SignalEvent) => {
        if (!fromSocketId) {
          console.warn("[webrtc] signal without fromSocketId, ignoring");
          return;
        }

        const selfId = socket.id;
        if (fromSocketId === selfId) return;

        let pc = peerConnections.get(fromSocketId);

        const queueCandidate = (candidate: RTCIceCandidateInit) => {
          const list = pendingCandidates.get(fromSocketId) || [];
          list.push(candidate);
          pendingCandidates.set(fromSocketId, list);
        };

        console.log(
          "[webrtc] signal",
          type,
          "from",
          fromSocketId,
          "pc exists?",
          !!pc,
          "state:",
          pc?.signalingState,
        );

        if (type === "offer") {
          if (!pc) {
            pc = await createPeerConnection(fromSocketId, false);
            if (!pc) return;
          }

          try {
            console.log(
              "[webrtc] handling OFFER in state:",
              pc.signalingState,
            );

            if (pc.signalingState !== "stable") {
              console.warn(
                "[webrtc] got offer in non-stable state, ignoring",
                pc.signalingState,
              );
              return;
            }

            await pc.setRemoteDescription(
              new RTCSessionDescription(data as RTCSessionDescriptionInit),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("signal", {
              targetSocketId: fromSocketId,
              type: "answer",
              data: answer,
            } as SignalEvent);

            const queued = pendingCandidates.get(fromSocketId) || [];
            for (const c of queued) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (err) {
                console.error("[webrtc] error adding queued ICE", err);
              }
            }
            pendingCandidates.delete(fromSocketId);
          } catch (err) {
            console.error("[webrtc] error handling offer", err);
          }
        } else if (type === "answer") {
          pc = peerConnections.get(fromSocketId);
          if (!pc) {
            console.warn(
              "[webrtc] got answer but have no RTCPeerConnection for",
              fromSocketId,
            );
            return;
          }

          try {
            console.log(
              "[webrtc] handling ANSWER in state:",
              pc.signalingState,
            );

            if (pc.remoteDescription) {
              console.warn("[webrtc] duplicate answer received, ignoring");
              return;
            }

            if (pc.signalingState !== "have-local-offer") {
              console.warn(
                "[webrtc] answer in invalid state, ignoring:",
                pc.signalingState,
              );
              return;
            }

            await pc.setRemoteDescription(
              new RTCSessionDescription(data as RTCSessionDescriptionInit),
            );

            const queued = pendingCandidates.get(fromSocketId) || [];
            for (const c of queued) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (err) {
                console.error("[webrtc] error adding queued ICE", err);
              }
            }
            pendingCandidates.delete(fromSocketId);
          } catch (err) {
            console.error("[webrtc] error handling answer", err);
          }
        } else if (type === "ice-candidate") {
          const candidateData = data as RTCIceCandidateInit;

          pc = peerConnections.get(fromSocketId);
          if (!pc) {
            console.warn(
              "[webrtc] ICE before PC exists, queuing for",
              fromSocketId,
            );
            queueCandidate(candidateData);
            return;
          }

          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } else {
              console.warn(
                "[webrtc] ICE before remoteDescription, queueing for",
                fromSocketId,
              );
              queueCandidate(candidateData);
            }
          } catch (err) {
            console.error("[webrtc] error adding ice candidate", err);
          }
        }
      });

      socket.on("exception", (err: any) => {
        console.error("[voice] exception from server", err);
        stopPingMonitor();
        notify((prev) => ({
          ...prev,
          error: err?.message ?? "Voice error",
          joinedChannelId: null,
          connecting: false,
          pingMs: null,
        }));
      });
    }

    return socket;
  }, [cleanupPeer, createPeerConnection]);

  /* ------------ cleanup on unmount ------------ */

  useEffect(() => {
    return () => {
      console.log(
        "[voice-hook] cleanup on unmount (no socket disconnect here)",
      );
    };
  }, []);

  /* ------------ broadcast our audio state when it changes ------------ */

  useEffect(() => {
    const socket = socketSingleton;
    if (!socket) return;
    if (!voiceState.joinedChannelId) return;

    socket.emit("audio-state", {
      channelId: voiceState.joinedChannelId,
      micMuted,
      deafened,
    });
  }, [micMuted, deafened, state.joinedChannelId]);

  /* ------------ public API ------------ */

  const joinChannel = useCallback(
    async (channelId: string) => {
      console.log("[voice-hook] joinChannel called", channelId);
      const s = ensureSocket();
      if (!s) return;

      notify((prev) => ({
        ...prev,
        error: null,
        connecting: true,
      }));

      await ensureLocalStream();

      const emitJoin = () => {
        console.log("[voice-hook] emitting join-channel", channelId);
        s.emit("join-channel", { channelId });
        // joinedChannelId is set on channel-joined
      };

      if (s.connected) {
        emitJoin();
      } else {
        s.once("connect", emitJoin);
      }
    },
    [ensureSocket, ensureLocalStream],
  );

  const leaveChannel = useCallback(() => {
    console.log("[voice-hook] leaveChannel called");
    leaveCurrentChannel();
  }, [leaveCurrentChannel]);

  const peersArray = Object.values(state.peers);

  return {
    joinedChannelId: state.joinedChannelId,
    peers: peersArray,
    connecting: state.connecting,
    error: state.error,
    joinChannel,
    leaveChannel,
    localStream: state.localStream,
    outputVolume,
    pingMs: state.pingMs,
  };
}
