// components/dashboard/TeamChatPanel.tsx
"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Avatar,
} from "@mui/material";
import { Paperclip, Smile, Send, Image as ImageIcon } from "lucide-react";
import { useUserStore } from "@/lib/store/user";

export default function TeamChatPanel() {
  const currentUser = useUserStore((s) => s.user);
  const [value, setValue] = useState("");

  // purely cosmetic demo messages
  const demoMessages = [
    {
      id: "1",
      author: "System",
      isMe: false,
      text: "Welcome to your team room! This is where async chat will live.",
      time: "09:14",
    },
    ...(currentUser
      ? [
          {
            id: "2",
            author: currentUser.name || currentUser.username || "You",
            isMe: true,
            text: "Once backend is wired, messages will show up here in real-time.",
            time: "09:15",
          },
        ]
      : []),
  ];

  return (
    <Box
      sx={{
        height: "100%",
        borderRadius: "16px",
        border: "1px solid rgba(55,65,81,0.9)",
        backgroundColor: "var(--color-gray-900)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: "1px solid rgba(31,41,55,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--color-gray-300)",
            }}
          >
            Team chat
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              color: "var(--color-gray-500)",
            }}
          >
            Async discussion, quick notes, and dropped links.
          </Typography>
        </Box>
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: 1.5,
          py: 1.25,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {demoMessages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              justifyContent: msg.isMe ? "flex-end" : "flex-start",
            }}
          >
            <Box
              sx={{
                maxWidth: "72%",
                display: "flex",
                flexDirection: "column",
                alignItems: msg.isMe ? "flex-end" : "flex-start",
                gap: 0.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  color: "var(--color-gray-500)",
                }}
              >
                {msg.author} · {msg.time}
              </Typography>

              <Box
                sx={{
                  borderRadius: "14px",
                  px: 1,
                  py: 0.75,
                  backgroundColor: msg.isMe
                    ? "rgba(108,207,246,0.2)"
                    : "rgba(15,23,42,0.96)",
                  border: msg.isMe
                    ? "1px solid var(--color-primary-500)"
                    : "1px solid rgba(55,65,81,0.9)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "var(--color-gray-50)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.text}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}

        {demoMessages.length === 0 && (
          <Typography
            sx={{
              fontSize: 11,
              color: "var(--color-gray-500)",
            }}
          >
            No messages yet. When chat is implemented, this is where they’ll
            appear.
          </Typography>
        )}
      </Box>

      {/* Composer */}
      <Box
        sx={{
          borderTop: "1px solid rgba(31,41,55,0.9)",
          px: 1.25,
          py: 0.9,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        {/* Attachments */}
        <IconButton
          size="small"
          sx={{
            borderRadius: "999px",
            backgroundColor: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(75,85,99,0.9)",
            "&:hover": {
              backgroundColor: "rgba(15,23,42,1)",
              borderColor: "var(--color-primary-400)",
            },
          }}
        >
          <Paperclip className="h-4 w-4 text-gray-300" />
        </IconButton>
        <IconButton
          size="small"
          sx={{
            borderRadius: "999px",
            backgroundColor: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(75,85,99,0.9)",
            "&:hover": {
              backgroundColor: "rgba(15,23,42,1)",
              borderColor: "var(--color-primary-400)",
            },
          }}
        >
          <ImageIcon className="h-4 w-4 text-gray-300" />
        </IconButton>

        {/* Input */}
        <Box
          sx={{
            flex: 1,
            borderRadius: "999px",
            border: "1px solid rgba(75,85,99,0.9)",
            backgroundColor: "rgba(15,23,42,0.96)",
            px: 1.25,
            py: 0.25,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <InputBase
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a message…"
            sx={{
              flex: 1,
              fontSize: 13,
              color: "var(--color-gray-50)",
            }}
          />
          <IconButton
            size="small"
            sx={{
              borderRadius: "999px",
            }}
          >
            <Smile className="h-4 w-4 text-gray-300" />
          </IconButton>
        </Box>

        {/* Send button (UI only) */}
        <IconButton
          size="small"
          sx={{
            borderRadius: "999px",
            backgroundColor: "var(--color-primary-500)",
            color: "var(--color-bg-dark)",
            "&:hover": {
              backgroundColor: "var(--color-primary-400)",
            },
          }}
        >
          <Send className="h-4 w-4" />
        </IconButton>
      </Box>
    </Box>
  );
}
