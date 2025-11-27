"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUserStore } from "@/lib/store/user";
import { useLogout } from "@/lib/logout";
import {
  Box,
  Button,
  Avatar,
  Typography,
} from "@mui/material";
import { Sparkles, Clock, Globe2 } from "lucide-react";
import MeshSphereBackground from "@/components/background/MeshSphereBackground";
import { useEffect } from "react";
import { clearToken, getToken } from "@/lib/auth-storage";
import apiClient from "@/lib/api-client";
import { API_ENDPOINT } from "@/lib/api-url";

export default function HomePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const logout = useLogout();

  // 🔥 Hydrate user if we have a token but no user yet
  useEffect(() => {
  const token = getToken();
  if (!token || user) return;

  (async () => {
    try {
      const res = await apiClient.get(API_ENDPOINT.auth.me);
   
      setUser(res.data);
    } catch (err: any) {
      console.error("Failed to fetch /me", err);

      clearToken();
      setUser(null);
    }
  })();
}, [user, setUser]);


  const handleDashboardClick = () => router.push("/dashboard");
  const handleLoginClick = () => router.push("/auth/login");
  const handleRegisterClick = () => router.push("/auth/register");

  const initials =
    (user?.name || user?.email || "?")
      .split(" ")
      .map((p: string) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  const glassItem =
    " bg-white/10 border border-white/20 rounded-2xl";

  return (
    <Box
      component="main"
      sx={{ minHeight: "100vh" }}
      className="
        relative
        text-bglight
        flex flex-col
      "
    >
      {/* 3D background sphere in center */}
      <MeshSphereBackground />

      {/* SUPER light global tint over sphere (just enough for legibility) */}
      <div
        className="
          pointer-events-none
          fixed inset-0 -z-10
          bg-gradient-to-br
          from-bgdark/25 via-bgdark/15 to-primary-900/10
        "
      />

      {/* TOP NAV */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="
          relative z-10
          border-b border-white/10
          bg-bgdark/40 backdrop-blur-2xl
        "
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-xl bg-primary-500/20 border border-primary-400/70 flex items-center justify-center text-primary-200 text-xs font-semibold">
              WS
            </span>
            <div>
              <div className="font-display text-sm tracking-[0.24em] uppercase text-bglight">
                WorkSphere
              </div>
              <div className="text-[11px] text-graybrand-200">
                Async-first work OS
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 rounded-full bg-white/5 border border-white/20 px-2 py-1.5">
                <Avatar
                  sx={{
                    width: 26,
                    height: 26,
                    bgcolor: "rgba(108,207,246,0.2)",
                    fontSize: 12,
                  }}
                >
                  {initials}
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-graybrand-200">
                    Signed in
                  </span>
                  <span className="text-[12px] text-bglight font-medium truncate max-w-[160px]">
                    {user.name || user.email}
                  </span>
                </div>
              </div>
            )}

            {user ? (
              <>
                <Button
                  variant="contained"
                  onClick={handleDashboardClick}
                  className="
                    normal-case text-bgdark text-xs sm:text-sm
                    bg-primary-500 hover:bg-primary-400
                    shadow-[0_12px_40px_rgba(108,207,246,0.7)]
                    px-4
                  "
                >
                  Dashboard
                </Button>
                <Button
                  variant="text"
                  onClick={logout}
                  className="normal-case text-xs text-graybrand-200 hover:text-bglight"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="text"
                  onClick={handleLoginClick}
                  className="normal-case text-xs text-graybrand-100 hover:text-bglight"
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  onClick={handleRegisterClick}
                  className="
                    normal-case text-bgdark text-xs sm:text-sm
                    bg-primary-500 hover:bg-primary-400
                    shadow-[0_12px_40px_rgba(108,207,246,0.7)]
                    px-4
                  "
                >
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* MAIN HERO – items left & right, sphere in the middle */}
      <section
        className="
          relative z-10
          flex-1
          flex items-center justify-around
          px-4 py-10 lg:py-16
        "
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-6xl"
        >
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.4fr)_minmax(0,1.3fr)]
              gap-8
              items-center
              w-full
            "
          >
            {/* LEFT COLUMN – mapped items (slight curve via vertical offsets) */}
            <div className="flex flex-col gap-5">
              {/* top pill */}
              <motion.div
                initial={{ opacity: 0, x: -20, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className={`
                  inline-flex items-center gap-2
                  ${glassItem}
                  px-3 py-1
                  self-start
                `}
              >
                <Sparkles className="h-3 w-3 text-accent-400" />
                <span className="text-[11px] tracking-[0.26em] uppercase text-graybrand-50">
                  Async • Remote • Calm
                </span>
              </motion.div>

              {/* main headline card */}
              <motion.div
                initial={{ opacity: 0, x: -24, y: 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className={`
                  ${glassItem}
                  p-5 sm:p-6
                  max-w-xl
                `}
              >
                <h1 className="font-display text-[2rem] sm:text-[2.4rem] lg:text-[2.8rem] leading-tight tracking-[0.18em] uppercase">
                  Design your
                  <br />
                  <span className="text-primary-300">remote rhythm</span>
                </h1>
                <p className="mt-3 text-sm sm:text-[15px] text-graybrand-50 leading-relaxed">
                  WorkSphere helps distributed teams stay in sync without
                  melting their calendars — live presence, timezone-aware
                  scheduling, and channels that protect deep work.
                </p>
              </motion.div>

              {/* CTA card slightly lower (curve) */}
              <motion.div
                initial={{ opacity: 0, x: -24, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 10 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className={`
                  ${glassItem}
                  p-4 sm:p-5
                  flex flex-col sm:flex-row sm:items-center gap-3
                  max-w-xl
                `}
              >
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-graybrand-200 mb-1">
                    Get started
                  </p>
                  <p className="text-[13px] text-graybrand-50">
                    Jump into your async workspace and start coordinating
                    presence, focus, and tasks with your team.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleDashboardClick}
                    className="
                      normal-case text-[12px]
                      bg-primary-500 hover:bg-primary-400
                      text-bgdark
                      px-4
                      shadow-[0_16px_40px_rgba(108,207,246,0.8)]
                    "
                  >
                    {user ? "Open dashboard" : "View dashboard"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={user ? handleLoginClick : handleRegisterClick}
                    className="
                      normal-case text-[12px]
                      border-white/45 hover:border-white/80
                      text-graybrand-50 hover:text-bglight
                      bg-white/5 hover:bg-white/10
                    "
                  >
                    {user ? "Switch account" : "Create account"}
                  </Button>
                </div>
              </motion.div>

              {/* benefits row as another small glass item */}
              <motion.div
                initial={{ opacity: 0, x: -20, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 20 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={`
                  ${glassItem}
                  px-4 py-3
                  text-[11px]
                  flex flex-wrap gap-3
                  max-w-md
                `}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-primary-300" />
                  <span>Async by default, meetings optional</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe2 className="h-3 w-3 text-accent-300" />
                  <span>Built for global teams across timezones</span>
                </div>
              </motion.div>
            </div>

            {/* MIDDLE COLUMN – keep empty to let sphere be fully visible */}
            <div className="hidden lg:block" />

            {/* RIGHT COLUMN – mapped items mirroring curve */}
            <div className="flex flex-col gap-5 items-end">
              {/* Snapshot card – slightly higher */}
              <motion.div
                initial={{ opacity: 0, x: 24, y: -10 }}
                animate={{ opacity: 1, x: 0, y: -10 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className={`
                  ${glassItem}
                  p-4 sm:p-5
                  w-full max-w-sm
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-graybrand-200">
                    Snapshot
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-graybrand-100">
                    Private preview
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-graybrand-50">
                  <li>• Teams, roles, and permissions tailored to your org</li>
                  <li>• Messaging &amp; voice servers for focused collaboration</li>
                  <li>• Presence &amp; focus state that respects deep work</li>
                </ul>
              </motion.div>

              {/* User / guest card – center of right stack */}
              <motion.div
                initial={{ opacity: 0, x: 24, y: 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className={`
                  ${glassItem}
                  p-4
                  w-full max-w-sm
                  flex items-center gap-3
                `}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "rgba(108,207,246,0.18)",
                    color: "#6CCFF6",
                    fontSize: 16,
                  }}
                >
                  {initials}
                </Avatar>
                {user ? (
                  <div className="flex-1 min-w-0">
                    <Typography
                      variant="body2"
                      className="text-bglight truncate"
                    >
                      {user.name || "No name set"}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-graybrand-200 truncate"
                    >
                      {user.email}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-primary-200 mt-1 block"
                    >
                      You&apos;re ready to continue where you left off.
                    </Typography>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <Typography variant="body2" className="text-bglight">
                      You&apos;re viewing WorkSphere as a guest.
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-graybrand-200"
                    >
                      Log in or create an account to unlock your dashboard.
                    </Typography>
                  </div>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={user ? handleDashboardClick : handleRegisterClick}
                  className="
                    normal-case text-[11px]
                    border-primary-400/70 hover:border-primary-200
                    text-primary-200 hover:text-primary-50
                    px-2
                  "
                >
                  {user ? "Dashboard" : "Join now"}
                </Button>
              </motion.div>

              {/* Small info card – slightly lower for the curve */}
              <motion.div
                initial={{ opacity: 0, x: 24, y: 14 }}
                animate={{ opacity: 1, x: 0, y: 14 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className={`
                  ${glassItem}
                  p-4
                  w-full max-w-sm
                  text-[12px] text-graybrand-100
                `}
              >
                <p className="font-medium text-bglight mb-1">
                  Calm, not chaotic.
                </p>
                <p className="text-[11px] text-graybrand-200">
                  Channels stay live, but you control when you&apos;re
                  interruptible. The dashboard is where you&apos;ll tune your
                  presence, focus blocks, and availability.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </Box>
  );
}
