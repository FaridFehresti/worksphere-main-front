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
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useVoiceChannel() {
  console.log("[voice-hook] useVoiceChannel init");

  const { inputDeviceId, outputVolume } = useAudioStore();

  const [joinedChannelId, setJoinedChannelId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({});
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------ helpers: local media ------------ */

  const stopLocalStream = useCallback(() => {
    if (myStream) {
      console.log("[voice-hook] stopLocalStream");
      myStream.getTracks().forEach((t) => t.stop());
      myStream = null;
    }
  }, []);

  /**
   * Try to get local mic, but if it fails we just log and continue.
   * This allows LISTENER-ONLY users (no mic / no permissions).
   */
  const ensureLocalStream = useCallback(async () => {
    if (myStream) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("[voice-hook] getUserMedia not available");
      return;
    }

    try {
      console.log("[voice-hook] ensureLocalStream: trying to acquire mic");
      const constraints: MediaStreamConstraints = {
        audio: inputDeviceId ? { deviceId: { exact: inputDeviceId } } : true,
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      myStream = stream;
      console.log("[voice-hook] ensureLocalStream: got local media stream");
    } catch (err) {
      console.warn("[voice-hook] ensureLocalStream: failed to get mic", err);
      // NOTE: do NOT throw. We allow recv-only behavior.
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

    setPeers((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });
  }, []);

  const leaveCurrentChannel = useCallback(() => {
    const socket = socketSingleton;
    console.log("[voice-hook] leaveCurrentChannel", joinedChannelId);

    if (socket && joinedChannelId) {
      socket.emit("leave-channel", { channelId: joinedChannelId });
    }

    for (const peerId of peerConnections.keys()) {
      cleanupPeer(peerId);
    }
    peerConnections.clear();
    stopLocalStream();
    setJoinedChannelId(null);
    setPeers({});
  }, [cleanupPeer, joinedChannelId, stopLocalStream]);

  /**
   * Create RTCPeerConnection for a peer.
   *
   * - If we have a local stream, we add its tracks.
   * - If we do NOT have a local stream but we're the INITIATOR:
   *   we add a recvonly transceiver so we can still receive audio.
   */
  const createPeerConnection = useCallback(
    async (peerSocketId: string, isInitiator: boolean) => {
      const socket = socketSingleton;
      if (!socket) {
        console.warn("[voice-hook] no socket in createPeerConnection");
        return;
      }

      // Try to get local media but allow failure (listener-only).
      await ensureLocalStream();

      console.log(
        "[voice-hook] creating RTCPeerConnection for",
        peerSocketId,
        "initiator:",
        isInitiator
      );

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // If we have a local stream -> add tracks (we are sending audio).
      if (myStream) {
        myStream.getTracks().forEach((track) => {
          pc.addTrack(track, myStream!);
        });
      } else if (isInitiator) {
        // No local stream, but we are the offerer:
        // explicitly say "I want to RECEIVE audio" (recvonly).
        console.log(
          "[voice-hook] no local stream, adding recvonly audio transceiver"
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

        setPeers((prev) => ({
          ...prev,
          [peerSocketId]: {
            ...(prev[peerSocketId] ?? { socketId: peerSocketId }),
            stream: remoteStream,
          },
        }));
      };

      peerConnections.set(peerSocketId, pc);

      setPeers((prev) => ({
        ...prev,
        [peerSocketId]: prev[peerSocketId] ?? { socketId: peerSocketId },
      }));

      // If we are initiator -> we create and send an offer.
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
    [ensureLocalStream]
  );

  /* ------------ ensure & connect socket ------------ */

  const ensureSocket = useCallback((): Socket | null => {
    if (typeof window === "undefined") return null;

    // shared socket instance
    if (!socketSingleton) {
      console.log("[voice-hook] creating voice socket");
      socketSingleton = getVoiceSocket();
    }
    const socket = socketSingleton;

    // set auth
    const token = getToken();
    if (token) {
      (socket as any).auth = { token };
      console.log("[voice-hook] set socket auth token");
    } else {
      console.warn("[voice-hook] no token in ensureSocket");
    }

    // Attach listeners only once per tab
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
        setError(err.message || "Voice connection failed");
      });

      socket.on("channel-joined", async (event: ChannelJoinedEvent) => {
        console.log("[voice] channel-joined", event);

        setJoinedChannelId(event.channelId);

        // For each existing peer: we are the INITIATOR
        for (const peerId of event.existingPeers) {
          await createPeerConnection(peerId, true);
        }
      });

      socket.on("peer-joined", async (event: PeerJoinedEvent) => {
        console.log("[voice] peer-joined", event);
        if (!joinedChannelId || joinedChannelId !== event.channelId) {
          // We'll still create PCs if needed once joinedChannelId updates,
          // but avoid stale channel events.
        }

        const { socketId, userId } = event;

        setPeers((prev) => ({
          ...prev,
          [socketId]: {
            ...(prev[socketId] ?? { socketId }),
            userId,
          },
        }));

        // New peer joined our already-joined channel -> we are ANSWERER
        if (!peerConnections.get(socketId)) {
          await createPeerConnection(socketId, false);
        }
      });

      socket.on("peer-left", (event: PeerLeftEvent) => {
        console.log("[voice] peer-left", event);
        cleanupPeer(event.socketId);
      });

      // --- SIGNAL HANDLER: offers / answers / ICE ---
      socket.on(
        "signal",
        async ({ fromSocketId, type, data }: SignalEvent) => {
          // ✅ guard to ensure fromSocketId is a string below
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
            pc?.signalingState
          );

          if (type === "offer") {
            // We are the ANSWERER
            if (!pc) {
              pc = await createPeerConnection(fromSocketId, false);
              if (!pc) return;
            }

            try {
              console.log(
                "[webrtc] handling OFFER in state:",
                pc.signalingState
              );

              // Basic glare handling – ignore offers in weird states
              if (pc.signalingState !== "stable") {
                console.warn(
                  "[webrtc] got offer in non-stable state, ignoring",
                  pc.signalingState
                );
                return;
              }

              await pc.setRemoteDescription(
                new RTCSessionDescription(data as RTCSessionDescriptionInit)
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
            // We are the INITIATOR
            pc = peerConnections.get(fromSocketId);
            if (!pc) {
              console.warn(
                "[webrtc] got answer but have no RTCPeerConnection for",
                fromSocketId
              );
              return;
            }

            try {
              console.log(
                "[webrtc] handling ANSWER in state:",
                pc.signalingState
              );

              // Guard: if we already have a remoteDescription, ignore duplicates
              if (pc.remoteDescription) {
                console.warn(
                  "[webrtc] duplicate answer received, ignoring"
                );
                return;
              }

              if (pc.signalingState !== "have-local-offer") {
                console.warn(
                  "[webrtc] answer in invalid state, ignoring:",
                  pc.signalingState
                );
                return;
              }

              await pc.setRemoteDescription(
                new RTCSessionDescription(data as RTCSessionDescriptionInit)
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
                fromSocketId
              );
              queueCandidate(candidateData);
              return;
            }

            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(
                  new RTCIceCandidate(candidateData)
                );
              } else {
                console.warn(
                  "[webrtc] ICE before remoteDescription, queueing for",
                  fromSocketId
                );
                queueCandidate(candidateData);
              }
            } catch (err) {
              console.error("[webrtc] error adding ice candidate", err);
            }
          }
        }
      );

      socket.on("exception", (err: any) => {
        console.error("[voice] exception from server", err);
        setError(err?.message ?? "Voice error");
        setJoinedChannelId(null);
      });
    }

    return socket;
  }, [cleanupPeer, createPeerConnection, joinedChannelId]);

  /* ------------ cleanup on unmount ------------ */

  useEffect(() => {
    return () => {
      console.log(
        "[voice-hook] cleanup on unmount (no socket disconnect here)"
      );
      // We deliberately do NOT disconnect the singleton socket here,
      // because other hook instances (or components) in this tab may still use it.
    };
  }, []);

  /* ------------ public API ------------ */

  const joinChannel = useCallback(
    async (channelId: string) => {
      console.log("[voice-hook] joinChannel called", channelId);
      if (!channelId) return;

      const socket = ensureSocket();
      if (!socket) {
        setError("No voice socket available");
        return;
      }

      if (!socket.connected) {
        console.log("[voice-hook] socket not connected, connecting now…");
        socket.connect();
      }

      if (joinedChannelId && joinedChannelId !== channelId) {
        leaveCurrentChannel();
      }

      try {
        setConnecting(true);
        setError(null);

        // We TRY to get mic, but if it fails we still join as listener-only.
        await ensureLocalStream();

        console.log("[voice-hook] emitting join-channel", channelId);
        socket.emit("join-channel", { channelId });
      } catch (err: any) {
        console.error("Failed to join voice channel", err);
        setError(err?.message ?? "Failed to join voice channel");
      } finally {
        setConnecting(false);
      }
    },
    [ensureLocalStream, ensureSocket, joinedChannelId, leaveCurrentChannel]
  );

  const leaveChannel = useCallback(() => {
    console.log("[voice-hook] leaveChannel called");
    leaveCurrentChannel();
  }, [leaveCurrentChannel]);

  return {
    joinedChannelId,
    peers: Object.values(peers),
    connecting,
    error,
    joinChannel,
    leaveChannel,
    localStream: myStream,
    outputVolume,
  };
}
