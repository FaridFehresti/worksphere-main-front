// components/DashboardShell.tsx
"use client";

import { Box } from "@mui/material";
import Sidebar from "./dashboard/sidebar/Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Box className="min-h-screen flex bg-bgdark relative">
      {/* Sidebar */}
      <Sidebar />   

      {/* Content */}
      <Box className="flex-1 p-6 overflow-y-auto">
        {children}
      </Box>
    </Box>
  );
}
