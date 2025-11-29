"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import type { TextFieldProps } from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Sparkles,
  UserPlus2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";

import { getTimeZones } from "@vvo/tzdb";

import apiClient from "@/lib/api-client";
import { setToken } from "@/lib/auth-storage";
import { API_ENDPOINT } from "@/lib/api-url";
import { useUserStore } from "@/lib/store/user";

type TimezoneOption = { label: string; value: string };

type RegisterResponse = { token: string };
type MeResponse = any; // Replace with your user type

const MAX_AVATAR_SIZE_MB = 2;

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

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [accountCreated, setAccountCreated] = useState(false);

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 2 fields (optional)
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState<string>("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Timezone options (IANA)
  const timezoneOptions = useMemo<TimezoneOption[]>(() => {
    const zones = getTimeZones();

    const formatOffset = (minutes: number) => {
      const sign = minutes >= 0 ? "+" : "-";
      const abs = Math.abs(minutes);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    return zones
      .sort(
        (a, b) => a.currentTimeOffsetInMinutes - b.currentTimeOffsetInMinutes
      )
      .map((tz) => ({
        label: `${tz.name} (UTC${formatOffset(tz.currentTimeOffsetInMinutes)})`,
        value: tz.name,
      }));
  }, []);

  // Map string state -> TimezoneOption for Autocomplete value
  const selectedTimezone = useMemo<TimezoneOption | null>(
    () => timezoneOptions.find((tz) => tz.value === timezone) ?? null,
    [timezoneOptions, timezone]
  );

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // ──────────────────────────────
  // Validation for step 1
  // ──────────────────────────────
  const validateStep1 = () => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(errors);
    setStep1Error(
      Object.keys(errors).length
        ? "Please fix the highlighted fields before continuing."
        : null
    );

    return Object.keys(errors).length === 0;
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleBackToStep1 = () => {
    setStep2Error(null);
    setStep(1);
  };

  // ──────────────────────────────
  // Avatar handlers
  // ──────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_AVATAR_SIZE_MB) {
      setStep2Error(`Avatar too large. Max size is ${MAX_AVATAR_SIZE_MB}MB.`);
      return;
    }

    setStep2Error(null);
    setAvatarFile(file);

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleClearAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  // ──────────────────────────────
  // Core: create account (once) + optional profile/avatar
  // ──────────────────────────────
  const completeRegistration = async (skipProfile: boolean) => {
    setStep1Error(null);
    setStep2Error(null);

    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      // 1) Register user if not already created
      if (!accountCreated) {
        const res = await apiClient.post<RegisterResponse>(
          API_ENDPOINT.auth.register,
          {
            email: email.trim(),
            name: name.trim(),
            password,
            username: username || undefined,
            timezone: timezone || undefined,
          }
        );

        const token = res.data.token;
        setToken(token);

        const meRes = await apiClient.get<MeResponse>(API_ENDPOINT.auth.me);
        useUserStore.getState().setUser(meRes.data);
        setAccountCreated(true);
      }

      // 2) If user chose to skip profile, we’re done
      if (skipProfile) {
        router.push("/");
        return;
      }

      // 3) Optional profile PATCH
      if (username || timezone || name) {
        const profileRes = await apiClient.patch<MeResponse>(
          API_ENDPOINT.users.updateMe,
          {
            name: name || undefined,
            username: username || undefined,
            timezone: timezone || undefined,
          }
        );
        useUserStore.getState().setUser(profileRes.data);
      }

      // 4) Optional avatar upload
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const avatarRes = await apiClient.post<MeResponse>(
          API_ENDPOINT.users.uploadAvatar,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        useUserStore.getState().setUser(avatarRes.data);
      }

      // 5) Done
      router.push("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Something went wrong while creating your account. Please try again.";

      if (msg.toLowerCase().includes("email is already in use")) {
        setAccountCreated(false);
        setStep(1);
        setStep1Error("This email is already in use. Try logging in instead.");
      } else if (!accountCreated) {
        setStep(1);
        setStep1Error(msg);
      } else {
        setStep(2);
        setStep2Error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    void completeRegistration(false);
  };

  const handleSkipStep2 = () => {
    void completeRegistration(true);
  };

  const stepVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  };

  const stepTitle = step === 1 ? "Create your account" : "Personalize your sphere";
  const stepSubtitle =
    step === 1
      ? "Just the essentials: name, email, password."
      : "Optional touches so your teammates recognize you instantly.";

  return (
    <main
      style={{ backgroundImage: "url('/backgrounds/login.png')" }}
      className="
        min-h-screen
        bg-cover bg-center bg-no-repeat
        flex items-center justify-center
        px-4 py-8
      "
    >
      <div className="absolute inset-0 bg-gradient-to-br from-bgdark/80 via-bgdark/70 to-primary-900/80 -z-10" />

      <div className="w-full max-w-6xl mx-auto grid items-center gap-12 lg:gap-20 xl:gap-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] relative">
        {/* LEFT: card */}
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
            <div className="pointer-events-none absolute -top-32 -right-20 h-64 w-64 rounded-full bg-primary-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-10 h-56 w-56 rounded-full bg-accent-400/25 blur-3xl" />

            <CardContent className="relative p-8 sm:p-10 space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[12px] text-graybrand-100">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-300 animate-pulse" />
                    <span>Step {step} of 2</span>
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
                    {stepTitle}
                  </Typography>

                  <Typography className="text-graybrand-50 text-xs leading-relaxed">
                    {stepSubtitle}
                  </Typography>
                </div>
              </div>

              {/* Errors */}
              {step === 1 && step1Error && (
                <div className="text-sm rounded-md bg-red-950/70 text-red-100 px-3 py-2 border border-red-400/60">
                  {step1Error}
                </div>
              )}
              {step === 2 && step2Error && (
                <div className="text-sm rounded-md bg-red-950/70 text-red-100 px-3 py-2 border border-red-400/60">
                  {step2Error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* STEP 1 */}
                {step === 1 && (
                  <motion.form
                    key="step1"
                    onSubmit={handleStep1Next}
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <TextField
                        {...authTextFieldBaseProps}
                        label="Full name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        error={!!fieldErrors.name}
                        helperText={fieldErrors.name}
                        FormHelperTextProps={{
                          className: "text-red-300 text-xs",
                        }}
                        sx={{ mb: 1.5 }}
                      />

                      <TextField
                        {...authTextFieldBaseProps}
                        label="Work email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        autoComplete="email"
                        error={!!fieldErrors.email}
                        helperText={fieldErrors.email}
                        FormHelperTextProps={{
                          className: "text-red-300 text-xs",
                        }}
                        sx={{ mb: 1.5 }}
                      />

                      <TextField
                        {...authTextFieldBaseProps}
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFieldErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }}
                        autoComplete="new-password"
                        error={!!fieldErrors.password}
                        helperText={
                          fieldErrors.password || "At least 6 characters"
                        }
                        FormHelperTextProps={{
                          className: fieldErrors.password
                            ? "text-red-300 text-xs"
                            : "text-graybrand-300 text-xs",
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-graybrand-200">
                      <span>We only use this for your account.</span>
                      <span className="text-graybrand-300">Required</span>
                    </div>

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={submitting}
                      className="
                        h-11 font-sans font-medium
                        bg-primary-500 hover:bg-primary-400
                        text-bgdark
                        shadow-[0_12px_40px_rgba(108,207,246,0.5)]
                        transition-all duration-200
                        hover:shadow-[0_18px_60px_rgba(108,207,246,0.7)]
                        flex items-center justify-center gap-2
                      "
                    >
                      <span>Next</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.form>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <motion.form
                    key="step2"
                    onSubmit={handleStep2Submit}
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03, rotate: 0.5 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          const input = document.getElementById(
                            "avatar-input"
                          ) as HTMLInputElement | null;
                          input?.click();
                        }}
                        className="
                          relative
                          w-20 h-20
                          rounded-full
                          border border-white/40
                          bg-white/10
                          flex items-center justify-center
                          overflow-hidden
                          shadow-[0_0_0_1px_rgba(255,255,255,0.1)]
                        "
                      >
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-graybrand-200" />
                        )}

                        <span className="absolute bottom-0 right-0 translate-x-1 translate-y-1 inline-flex items-center justify-center rounded-full bg-primary-500 text-bgdark h-5 w-5 shadow-md">
                          <Sparkles className="h-3 w-3" />
                        </span>
                      </motion.button>

                      <input
                        id="avatar-input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleAvatarChange}
                      />

                      <div className="flex items-center gap-3 text-[11px] text-graybrand-200">
                        <span>Tap the circle to add an avatar.</span>
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={handleClearAvatar}
                            className="text-graybrand-100 hover:text-bglight underline underline-offset-4"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fields – keep spacing consistent with step 1 */}
                    <div className="space-y-4">
                      <TextField
                        {...authTextFieldBaseProps}
                        label="Username (optional)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        sx={{ mb: 1.5 }}
                      />

                      <Autocomplete<TimezoneOption, false, false, false>
                        options={timezoneOptions}
                        value={selectedTimezone}
                        onChange={(_, newValue) => {
                          setTimezone(newValue?.value ?? "");
                        }}
                        getOptionLabel={(option) => option.label}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            {...authTextFieldBaseProps}
                            label="Timezone (optional)"
                            placeholder="Search your timezone"
                          />
                        )}
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            borderRadius: "0.75rem",
                          },
                        }}
                      />
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-[12px] text-graybrand-200">
                      <span>These details help your team recognize you.</span>
                      <span className="text-graybrand-300">Optional</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="text"
                        disabled={submitting && !accountCreated}
                        onClick={handleBackToStep1}
                        className="
                          h-10 font-sans font-medium
                          text-graybrand-100 hover:text-bglight
                          normal-case text-xs
                          flex items-center gap-1
                        "
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="text"
                          disabled={submitting}
                          onClick={handleSkipStep2}
                          className="
                            h-10 font-sans font-medium
                            text-graybrand-100 hover:text-bglight
                            normal-case text-xs
                            flex items-center gap-1
                          "
                        >
                          Skip for now
                          <ArrowRight className="h-4 w-4" />
                        </Button>

                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={submitting}
                          className="
                            h-10 font-sans font-medium
                            bg-primary-500 hover:bg-primary-400
                            text-bgdark
                            shadow-[0_12px_40px_rgba(108,207,246,0.5)]
                            transition-all duration-200
                            hover:shadow-[0_18px_60px_rgba(108,207,246,0.7)]
                            flex items-center justify-center gap-2
                          "
                        >
                          {submitting ? (
                            <>
                              <CircularProgress size={16} color="inherit" />
                              <span>Entering...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Enter workspace</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

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

        {/* RIGHT SIDE */}
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
