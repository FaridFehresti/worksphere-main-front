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

// Local mic stream (if we have one)
let myStream: MediaStream | null = null;

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

export type VoicePeer = {
  socketId: string;
  userId?: string;
  stream?: MediaStream;
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
};

let voiceState: VoiceState = {
  joinedChannelId: null,
  peers: {},
  connecting: false,
  error: null,
  localStream: null,
};

type Subscriber = (state: VoiceState) => void;
const subscribers = new Set<Subscriber>();

function notify(updater: (prev: VoiceState) => VoiceState) {
  voiceState = updater(voiceState);
  subscribers.forEach((fn) => fn(voiceState));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useVoiceChannel() {
  console.log("[voice-hook] useVoiceChannel init");

  const { inputDeviceId, outputVolume } = useAudioStore();

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

  /* ------------ helpers: local media ------------ */

  const stopLocalStream = useCallback(() => {
    if (myStream) {
      console.log("[voice-hook] stopLocalStream");
      myStream.getTracks().forEach((t) => t.stop());
      myStream = null;
    }

    notify((prev) => ({
      ...prev,
      localStream: null,
    }));
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (voiceState.localStream) return voiceState.localStream;

    console.log("[voice-hook] ensureLocalStream: trying to acquire mic");

    try {
      if (inputDeviceId) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: inputDeviceId } },
          });
          console.log(
            "[voice-hook] ensureLocalStream: got stream with selected device",
          );
          myStream = stream;
          notify((prev) => ({ ...prev, localStream: stream }));
          return stream;
        } catch (err) {
          console.warn(
            "[voice-hook] ensureLocalStream: failed with selected device, err=",
            err,
          );
        }
      }

      console.log("[voice-hook] retrying getUserMedia with default device");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[voice-hook] ensureLocalStream: got fallback stream");
      myStream = stream;
      notify((prev) => ({ ...prev, localStream: stream }));
      return stream;
    } catch (err) {
      console.warn(
        "[voice-hook] fallback getUserMedia failed, joining as listener only",
        err,
      );
      return null;
    }
  }, [inputDeviceId]);

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

    notify((prev) => ({
      ...prev,
      joinedChannelId: null,
      peers: {},
      connecting: false,
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
          [peerSocketId]: prev.peers[peerSocketId] ?? { socketId: peerSocketId },
        },
      }));

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
      });

      socket.on("connect_error", (err) => {
        console.error("[voice] connect_error", err);
        notify((prev) => ({
          ...prev,
          error: err.message || "Voice connection failed",
          connecting: false,
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

        for (const peerId of event.existingPeers) {
          await createPeerConnection(peerId, true);
        }
      });

      socket.on("peer-joined", async (event: PeerJoinedEvent) => {
        console.log("[voice] peer-joined", event);

        const { channelId, socketId, userId } = event;

        if (!voiceState.joinedChannelId || voiceState.joinedChannelId !== channelId) {
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
        notify((prev) => ({
          ...prev,
          error: err?.message ?? "Voice error",
          joinedChannelId: null,
          connecting: false,
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
  };
}
