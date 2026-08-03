import React, { useState } from "react";
import { WORLD_CURRENCIES, getCurrencyLabel } from "../lib/currencies.js";
import {
  BUSINESS_TYPES,
  validateSignUp,
  validateWorkspaceInfo,
  validateStaffInvite,
  executeOnboardingPipeline
} from "../lib/onboarding.js";
import {
  User,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  ShieldCheck,
  ChevronLeft,
  X,
  Loader2,
  ShoppingBag,
  Briefcase,
  Utensils,
  HardHat,
  UserCheck,
  Layers,
  Check
} from "lucide-react";
import { auth, googleProvider } from "../lib/firebase.js";
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { findUserBusinesses } from "../lib/firestore.js";

export function OnboardingFlowModal({
  isOpen,
  onClose,
  onCompleteOnboarding,
  saveWorkspaceFn,
  saveMembersFn,
  saveCurrentUserFn,
  saveCategoriesFn
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Signup, 2: Workspace, 3: Business Type, 4: Staff Invites, 5: Confirmation
  const [errorMsg, setErrorMsg] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [authMode, setAuthMode] = useState("signup"); // 'signup' or 'signin'

  // Step 1: Signup form state
  const [signUpForm, setSignUpForm] = useState({
    displayName: "",
    emailOrPhone: "",
    password: ""
  });

  // Step 2: Workspace form state
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    currency: "USD"
  });

  // Step 3: Business type template selection state
  const [selectedBusinessType, setSelectedBusinessType] = useState("retail");

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setIsGoogleLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      setSignUpForm({
        displayName: user.displayName || "Owner",
        emailOrPhone: user.email || "",
        password: "google_oauth_authenticated",
        isGoogleAuth: true
      });

      // Check if the user already has a workspace (returning owner or invited member)
      const businesses = await findUserBusinesses(user.uid, user.email);
      if (businesses && businesses.length > 0) {
        const first = businesses[0];
        if (onCompleteOnboarding) {
          onCompleteOnboarding({
            workspace: { id: first.businessId, businessId: first.businessId, name: "My Workspace" },
            members: [first.member],
            ownerMember: first.member,
            categories: []
          });
        }
        onClose();
        return;
      }

      setCurrentStep(2);
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          setErrorMsg("Google Sign-In failed. Please use email and password.");
        }
      } else if (err.code !== "auth/user-cancelled") {
        setErrorMsg("Google Sign-In error: " + (err.message || "Failed to sign in"));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };



  // Step 3: Staff invite list state
  const [inviteInput, setInviteInput] = useState({
    displayName: "",
    email: "",
    phone: ""
  });
  const [invitedStaffList, setInvitedStaffList] = useState([]);

  // Final onboarding result state
  const [createdResult, setCreatedResult] = useState(null);

  if (!isOpen) return null;

  // Step 1 Submission — creates a real Firebase Auth user
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsEmailLoading(true);
    try {
      validateSignUp(signUpForm);

      if (authMode === "signup") {
        // Create a real Firebase Auth account
        const email = signUpForm.emailOrPhone.includes("@")
          ? signUpForm.emailOrPhone.trim()
          : null;
        if (!email) {
          throw new Error("Please use a valid email address to create an account.");
        }
        const res = await createUserWithEmailAndPassword(auth, email, signUpForm.password);
        const user = res.user;
        setSignUpForm((prev) => ({
          ...prev,
          displayName: prev.displayName || user.displayName || "Owner",
          emailOrPhone: user.email || prev.emailOrPhone,
          isGoogleAuth: false
        }));
      } else {
        // Sign in to an existing account
        const email = signUpForm.emailOrPhone.includes("@")
          ? signUpForm.emailOrPhone.trim()
          : null;
        if (!email) {
          throw new Error("Please use a valid email address to sign in.");
        }
        const res = await signInWithEmailAndPassword(auth, email, signUpForm.password);
        const user = res.user;
        setSignUpForm((prev) => ({
          ...prev,
          displayName: prev.displayName || user.displayName || "Owner",
          emailOrPhone: user.email || prev.emailOrPhone,
          isGoogleAuth: false
        }));
      }

      // After auth, check if the user already has a workspace
      const currentUser = auth.currentUser;
      if (currentUser) {
        const businesses = await findUserBusinesses(currentUser.uid, currentUser.email);
        if (businesses && businesses.length > 0) {
          // User already has a workspace — skip onboarding
          const first = businesses[0];
          if (onCompleteOnboarding) {
            onCompleteOnboarding({
              workspace: { id: first.businessId, businessId: first.businessId, name: "My Workspace" },
              members: [first.member],
              ownerMember: first.member,
              categories: []
            });
          }
          onClose();
          return;
        }
      }

      setCurrentStep(2);
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Step 2 Submission
  const handleWorkspaceSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      validateWorkspaceInfo(workspaceForm);
      setCurrentStep(3);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Add staff invite item
  const handleAddInviteItem = () => {
    setErrorMsg("");
    try {
      const validated = validateStaffInvite(inviteInput);
      setInvitedStaffList([...invitedStaffList, validated]);
      setInviteInput({ displayName: "", email: "", phone: "" });
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Remove staff invite item
  const handleRemoveInviteItem = (index) => {
    setInvitedStaffList(invitedStaffList.filter((_, i) => i !== index));
  };

  // Complete onboarding pipeline
  const handleFinalizeOnboarding = (skipInvites = false) => {
    setErrorMsg("");
    try {
      const validatedSignUp = validateSignUp(signUpForm);
      const validatedWs = validateWorkspaceInfo(workspaceForm);
      const staffToInvite = skipInvites ? [] : invitedStaffList;

      const result = executeOnboardingPipeline(
        {
          signUpData: validatedSignUp,
          workspaceData: validatedWs,
          businessType: selectedBusinessType,
          staffInvites: staffToInvite
        },
        {
          saveWorkspaceFn,
          saveMembersFn,
          saveCurrentUserFn,
          saveCategoriesFn
        }
      );

      setCreatedResult(result);
      setCurrentStep(5);
    } catch (err) {
      setErrorMsg(err.message || "Failed to complete workspace creation.");
    }
  };

  // Handoff to main workspace application
  const handleLaunchApp = () => {
    if (createdResult && onCompleteOnboarding) {
      onCompleteOnboarding(createdResult);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-8 relative bg-white border border-black/10 rounded-xl p-6 shadow-lg">
        {/* Header Bar: Stacks gracefully into 2 rows on mobile to prevent overlapping */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3.5 border-b border-black/10 mb-4">
          {/* Row 1 (Mobile) / Left Group (Desktop): Logo & Mobile Close Button */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <a href="/home" className="flex items-center gap-2 font-display font-bold text-lg text-[#000000] tracking-tight hover:opacity-80 transition-opacity no-underline shrink-0">
              <img src="/logo.jpg" alt="SnapSME Logo" className="w-7 h-7 rounded-lg object-cover border border-black/10 shrink-0" />
              <span>Snap<span className="text-[#0075de]">SME</span></span>
            </a>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden text-[#757575] hover:text-[#000000] p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2 (Mobile) / Right Group (Desktop): Badge & Step Indicator */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <span className="text-[11px] font-mono bg-[#e6f3fe] text-[#0075de] px-2.5 py-0.5 rounded-full font-bold shrink-0">
              {currentStep === 0 ? "Sign In" : "Owner Onboarding"}
            </span>

            <div className="flex items-center gap-3">
              {currentStep <= 4 && (
                <span className="text-xs font-semibold text-[#757575] shrink-0">
                  Step {currentStep} of 4
                </span>
              )}

              {/* Close Button on Desktop */}
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex text-[#757575] hover:text-[#000000] p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-4 flex items-start gap-2">
            <span className="font-bold">Error:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Owner Signup / Sign In */}
        {currentStep === 1 && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div className="text-center space-y-1 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#0075de]/10 text-[#0075de] flex items-center justify-center mx-auto mb-2">
                <User className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-xl text-[#000000]">
                {authMode === "signup" ? "Create Your Owner Account" : "Sign In to SnapSME"}
              </h2>
              <p className="text-xs text-[#615d59]">
                {authMode === "signup"
                  ? "Get started managing team expenses with real-time receipt capture"
                  : "Welcome back — never lose track of team spend again"}
              </p>
            </div>

            {/* Auth Mode Toggle */}
            <div className="grid grid-cols-2 bg-[#f6f5f4] p-1 rounded-lg border border-black/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`py-2 rounded-md transition-colors cursor-pointer ${
                  authMode === "signup"
                    ? "bg-white text-[#0075de] shadow-2xs border border-black/10"
                    : "text-[#615d59] hover:text-[#000000]"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`py-2 rounded-md transition-colors cursor-pointer ${
                  authMode === "signin"
                    ? "bg-white text-[#0075de] shadow-2xs border border-black/10"
                    : "text-[#615d59] hover:text-[#000000]"
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Google Sign In Option */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full bg-white hover:bg-gray-50 border border-black/15 text-xs font-semibold text-[#1c1b19] py-2.5 rounded-lg shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0075de]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-mono uppercase tracking-wider text-[#757575]">
                or
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000000] mb-1">
                Full Name {authMode === "signup" && <span className="text-[#f64932]">*</span>}
              </label>
              <input
                type="text"
                required={authMode === "signup"}
                value={signUpForm.displayName}
                onChange={(e) => setSignUpForm({ ...signUpForm, displayName: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000000] mb-1">
                Work Email or Mobile Phone <span className="text-[#f64932]">*</span>
              </label>
              <input
                type="text"
                required
                value={signUpForm.emailOrPhone}
                onChange={(e) => setSignUpForm({ ...signUpForm, emailOrPhone: e.target.value })}
                placeholder="e.g. sarah@acmetrading.com"
                className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000000] mb-1">
                Password <span className="text-[#f64932]">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={signUpForm.password}
                onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isEmailLoading}
                className="bg-[#0075de] hover:bg-[#0060b8] text-white w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{authMode === "signup" ? "Creating Account..." : "Signing In..."}</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === "signup" ? "Create Account & Continue" : "Sign In & Continue"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Workspace Setup */}
        {currentStep === 2 && (
          <form onSubmit={handleWorkspaceSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-[#615d59] hover:text-[#000000] flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <div className="text-center space-y-1 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#0075de]/10 text-[#0075de] flex items-center justify-center mx-auto mb-2">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-xl text-[#000000]">
                Create Business Workspace
              </h2>
              <p className="text-xs text-[#615d59]">
                Configure workspace defaults for your team (2–10 staff)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000000] mb-1">
                Business or Team Name <span className="text-[#f64932]">*</span>
              </label>
              <input
                type="text"
                required
                value={workspaceForm.name}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                placeholder="e.g. Acme Trading Co."
                className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000000] mb-1">
                Default Accounting Currency <span className="text-[#f64932]">*</span>
              </label>
              <select
                value={workspaceForm.currency}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, currency: e.target.value })}
                className="w-full bg-[#f6f5f4] border border-black/10 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[#0075de] cursor-pointer"
              >
                {WORLD_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {getCurrencyLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-[#e6f3fe] border border-black/10 rounded-lg text-xs text-[#0075de] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You will be assigned as primary <strong>Owner</strong>. You can change budget caps and manage team roles anytime in Settings.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-[#0075de] hover:bg-[#0060b8] text-white w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Continue to Business Category Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Business-Type Onboarding Template */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-semibold text-[#615d59] hover:text-[#000000] flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedBusinessType(null);
                  setCurrentStep(4);
                }}
                className="text-xs font-semibold text-[#615d59] hover:text-[#0075de] underline cursor-pointer"
              >
                I'll set up categories myself
              </button>
            </div>

            <div className="text-center space-y-1 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#0f7a52]/10 text-[#0f7a52] flex items-center justify-center mx-auto mb-2 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-xl text-[#000000]">
                What kind of business is this?
              </h2>
              <p className="text-xs text-[#615d59]">
                Select a business template to pre-populate default expense categories and remove blank-page friction
              </p>
            </div>

            {/* Business Type Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {BUSINESS_TYPES.map((bt) => {
                const isSelected = selectedBusinessType === bt.id;
                return (
                  <div
                    key={bt.id}
                    onClick={() => setSelectedBusinessType(bt.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-[#e7f4ec] border-[#0f7a52] shadow-2xs"
                        : "bg-[#f6f5f4] border-black/10 hover:border-black/25"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? "bg-[#0f7a52] text-white" : "bg-black/5 text-[#615d59]"
                    }`}>
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-display font-bold text-xs text-[#000000]">
                        {bt.name}
                      </h3>
                      <p className="text-[11px] text-[#615d59] leading-tight line-clamp-2">
                        {bt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="bg-[#0075de] hover:bg-[#0060b8] text-white w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Continue with Template</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Invite Staff (Optional & Skippable) */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-semibold text-[#615d59] hover:text-[#000000] flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-xs text-[#615d59] italic">Optional step</span>
            </div>

            <div className="text-center space-y-1 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#ffb110]/20 text-[#000000] flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-xl text-[#000000]">
                Invite Team Staff
              </h2>
              <p className="text-xs text-[#615d59]">
                Add staff members who will submit receipt photos or voice notes
              </p>
            </div>

            {/* Staff Input Row */}
            <div className="bg-[#f6f5f4] p-3 rounded-lg border border-black/10 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={inviteInput.displayName}
                  onChange={(e) => setInviteInput({ ...inviteInput, displayName: e.target.value })}
                  placeholder="Staff name (e.g. Marcus)"
                  className="w-full bg-white border border-black/10 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0075de]"
                />
                <input
                  type="text"
                  value={inviteInput.email || inviteInput.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes("@")) {
                      setInviteInput({ ...inviteInput, email: val, phone: "" });
                    } else {
                      setInviteInput({ ...inviteInput, phone: val, email: "" });
                    }
                  }}
                  placeholder="Email or Phone number"
                  className="w-full bg-white border border-black/10 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0075de]"
                />
              </div>

              <button
                type="button"
                onClick={handleAddInviteItem}
                className="bg-white hover:bg-black/5 border border-black/10 text-[#000000] w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Staff Invitation
              </button>
            </div>

            {/* Pending Invites List */}
            {invitedStaffList.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-mono font-bold text-[#615d59]">
                  Invited Staff ({invitedStaffList.length}):
                </span>
                {invitedStaffList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white border border-black/10 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#0075de]" />
                      <span className="font-bold text-[#000000]">
                        {item.displayName || item.email || item.phone}
                      </span>
                      <span className="text-[10px] font-mono text-[#615d59]">
                        ({item.email || item.phone})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInviteItem(idx)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleFinalizeOnboarding(true)}
                className="bg-[#f6f5f4] hover:bg-black/5 border border-black/10 text-[#615d59] flex-1 py-2.5 rounded-lg text-xs font-medium text-center cursor-pointer transition-all"
              >
                Skip for now, I'll invite later
              </button>
              <button
                type="button"
                onClick={() => handleFinalizeOnboarding(false)}
                className="bg-[#0075de] hover:bg-[#0060b8] text-white flex-1 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
              >
                Create & Finish Setup ({invitedStaffList.length} staff)
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirmation & Handoff */}
        {currentStep === 5 && createdResult && (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-[#0075de]/10 text-[#0075de] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="font-display font-bold text-2xl text-[#000000]">
                Your Workspace is Ready!
              </h2>
              <p className="text-xs text-[#615d59] mt-1">
                Workspace <strong>"{createdResult.workspace.name}"</strong> has been created with default currency <strong>{createdResult.workspace.currency}</strong>.
              </p>
            </div>

            <div className="bg-[#f6f5f4] p-4 rounded-lg border border-black/10 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-black/10">
                <span className="text-[#615d59]">Workspace ID:</span>
                <span className="font-mono font-bold text-[#000000]">{createdResult.workspace.businessId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-black/10">
                <span className="text-[#615d59]">Owner Role:</span>
                <span className="font-bold text-[#0075de]">{createdResult.ownerMember.displayName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#615d59]">Initial Members:</span>
                <span className="font-bold text-[#000000]">{createdResult.members.length} member(s)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLaunchApp}
              className="bg-[#0075de] hover:bg-[#0060b8] text-white w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Launch Workspace Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
