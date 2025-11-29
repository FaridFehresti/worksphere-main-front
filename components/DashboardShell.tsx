// components/DashboardShell.tsx
"use client";

import { useState } from "react";
import { Box, IconButton } from "@mui/material";
import { Menu, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from "./dashboard/sidebar/Sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-dark)",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      {/* Mobile top bar (desktop: hidden) */}
      <Box
        sx={{
          display: { xs: "flex", lg: "none" },
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: "12px",
          paddingBlock: "10px",
          borderBottom: "1px solid rgba(148,163,184,0.35)",
          backgroundColor: "rgba(0,16,17,0.96)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setSidebarOpen(true)}
          sx={{
            borderRadius: "10px",
            backgroundColor: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(148,163,184,0.6)",
            padding: "6px",
            "&:hover": {
              backgroundColor: "rgba(15,23,42,1)",
              borderColor: "var(--color-primary-400)",
            },
          }}
        >
          <Menu className="h-4 w-4 text-gray-100" />
        </IconButton>

        <Box
          sx={{
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-gray-100)",
          }}
        >
          WorkSphere • Dashboard
        </Box>

        <Box sx={{ width: 32 }} />
      </Box>

      {/* Main area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Desktop sidebar */}
        <Box
          sx={{
            display: { xs: "none", lg: "block" },
            flexShrink: 0,
          }}
        >
          <Sidebar />
        </Box>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              display: { xs: "flex", lg: "none" },
              pointerEvents: "auto",
            }}
          >
            <Box
              component={motion.div}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              sx={{
                width: "85%",
                maxWidth: 420,
                height: "100vh",
                backgroundColor: "var(--color-bg-dark)",
                boxShadow: "0 0 42px rgba(0,0,0,0.85)",
                borderRight: "1px solid rgba(15,23,42,0.9)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <Sidebar />
              <IconButton
                size="small"
                onClick={() => setSidebarOpen(false)}
                sx={{
                  position: "absolute",
                  top: "50%",
                  right: -16,
                  transform: "translateY(-50%)",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(15,23,42,0.98)",
                  border: "1px solid rgba(148,163,184,0.7)",
                  padding: "4px",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.8)",
                  "&:hover": {
                    backgroundColor: "rgba(15,23,42,1)",
                    borderColor: "var(--color-primary-400)",
                  },
                }}
              >
                <ChevronLeft className="h-4 w-4 text-gray-100" />
              </IconButton>
            </Box>

            <Box
              sx={{
                flex: 1,
                backgroundColor: "rgba(15,23,42,0.75)",
              }}
              onClick={() => setSidebarOpen(false)}
            />
          </Box>
        )}

        {/* Content area – now full remaining width */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            paddingInline: { xs: "16px", sm: "20px", md: "24px", lg: "32px" },
            paddingBlock: { xs: "20px", sm: "24px", md: "28px" },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
