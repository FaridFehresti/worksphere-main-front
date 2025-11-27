"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import type { TextFieldProps } from "@mui/material/TextField";
import { Sparkles, UserPlus2, ShieldCheck } from "lucide-react";

import apiClient from "@/lib/api-client";
import { setToken } from "@/lib/auth-storage";
import { API_ENDPOINT } from "@/lib/api-url";
import { useUserStore } from "@/lib/store/user";

// 🔧 API response types
type RegisterResponse = {
  token: string;
};

// If you have a concrete User type, replace `any`.
type MeResponse = any;

// 🔧 Same input theme as login
const authTextFieldBaseProps: Partial<TextFieldProps> = {
  variant: "outlined",
  size: "small",
  fullWidth: true,
  InputLabelProps: {
    className: "text-graybrand-200",
  },
  InputProps: {
    className: `
      text-bglight
      placeholder-graybrand-300
      bg-white/5
      rounded-xl
      [&_.MuiOutlinedInput-notchedOutline]:border-white/30
      [&:hover_.MuiOutlinedInput-notchedOutline]:border-white/60
      [&.Mui-focused_.MuiOutlinedInput-notchedOutline]:border-primary-300
      [&.Mui-focused_.MuiOutlinedInput-input]:text-bglight
    `,
  },
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      // 1. Register
      const res = await apiClient.post<RegisterResponse>(
        API_ENDPOINT.auth.register,
        {
          email,
          name,
          password,
        }
      );

      const token = res.data.token;
      setToken(token);

      // 2. Fetch user
      const me = await apiClient.get<MeResponse>(API_ENDPOINT.auth.me);

      // 3. Save in store
      useUserStore.getState().setUser(me.data);

      router.push("/");
    } catch {
      setError(
        "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        backgroundImage: "url('/backgrounds/login.png')",
      }}
      className="
        min-h-screen
        bg-cover bg-center bg-no-repeat
        flex items-center justify-center
        px-4 py-8
      "
    >
      {/* global dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-bgdark/80 via-bgdark/70 to-primary-900/80 -z-10" />

      <div className="w-full max-w-6xl mx-auto grid items-center gap-12 lg:gap-20 xl:gap-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] relative">
        {/* LEFT: glassmorphic register card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full flex justify-center"
        >
          <Card
            elevation={0}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            }}
            className="
              relative
              w-full
              max-w-lg
              overflow-hidden
              rounded-3xl
              border border-white/25
              bg-gradient-to-br from-white/25 via-white/10 to-white/5
            "
          >
            {/* highlight & tint overlay */}
            <div className="pointer-events-none absolute -top-32 -right-20 h-64 w-64 rounded-full bg-primary-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-10 h-56 w-56 rounded-full bg-accent-400/25 blur-3xl" />

            <CardContent className="relative p-8 sm:p-10 space-y-10">
              {/* Top header (mirrors login structure) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[12px] text-graybrand-100">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1 w-6 rounded-full bg-primary-300" />
                    Join WorkSphere
                  </span>

                  <button
                    type="button"
                    onClick={() => router.push("/auth/login")}
                    className="text-primary-100 hover:text-primary-50 font-medium transition-colors"
                  >
                    Log in
                  </button>
                </div>

                <div className="space-y-1">
                  <Typography
                    variant="h4"
                    className="font-display text-bglight tracking-[0.18em] uppercase"
                  >
                    WorkSphere
                  </Typography>

                  <Typography className="text-graybrand-50 text-sm leading-relaxed">
                    Create your account and start working async with your team.
                  </Typography>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm rounded-md bg-red-950/70 text-red-100 px-3 py-2 border border-red-400/60">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Inputs */}
                <div className="space-y-4">
                  <TextField
                    {...authTextFieldBaseProps}
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ marginBottom: "16px" }}
                  />

                  <TextField
                    {...authTextFieldBaseProps}
                    label="Work email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    sx={{ marginBottom: "16px" }}
                  />

                  <TextField
                    {...authTextFieldBaseProps}
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    helperText="At least 6 characters"
                    FormHelperTextProps={{
                      className: "text-graybrand-300 text-xs",
                    }}
                  />
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between text-[12px] text-graybrand-200">
                  <span>Use your work email to sign up.</span>
                  <span className="text-graybrand-300">
                    Takes less than a minute.
                  </span>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading}
                  className="
                    h-11 font-sans font-medium
                    bg-primary-500 hover:bg-primary-400
                    text-bgdark
                    shadow-[0_12px_40px_rgba(108,207,246,0.5)]
                    transition-all duration-200
                    hover:shadow-[0_18px_60px_rgba(108,207,246,0.7)]
                  "
                >
                  {loading ? "Creating your workspace..." : "Create account"}
                </Button>
              </form>

              {/* Footer */}
              <Typography className="text-[12px] text-graybrand-100 text-center">
                Already have an account?{" "}
                <a
                  href="/auth/login"
                  className="font-medium text-primary-100 hover:text-primary-50 transition-colors"
                >
                  Log in
                </a>
              </Typography>
            </CardContent>
          </Card>
        </motion.div>

        {/* RIGHT: Story / benefits */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="hidden lg:block"
        >
          <div className="space-y-7 text-bglight max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-bgdark/40 border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-graybrand-100">
              <Sparkles className="h-3 w-3 text-accent-400" />
              Create your async hub
            </div>

            <motion.h1
              className="font-display text-4xl xl:text-5xl leading-tight tracking-[0.2em] uppercase"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            >
              Build a
              <br />
              <span className="text-primary-300">calm workspace</span>
            </motion.h1>

            <p className="text-graybrand-100 text-sm max-w-md">
              Set up your WorkSphere profile and start coordinating presence,
              focus, and tasks with your team without living inside meetings.
            </p>

            <div className="space-y-4 text-sm">
              <motion.div
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <UserPlus2 className="h-4 w-4 mt-0.5 text-primary-300" />
                <div>
                  <p className="font-medium text-bglight">Instant onboarding</p>
                  <p className="text-graybrand-200 text-xs">
                    Create an account, invite your team, and start sharing
                    presence and tasks in minutes.
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <ShieldCheck className="h-4 w-4 mt-0.5 text-accent-300" />
                <div>
                  <p className="font-medium text-bglight">
                    Privacy-friendly by design
                  </p>
                  <p className="text-graybrand-200 text-xs">
                    You&apos;re in control of what you share: presence, focus
                    state, timezone, and availability.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
