import React, { useState } from "react";
import { TornCard } from "./TornCard.js";
import { WORLD_CURRENCIES, getCurrencyLabel } from "../lib/currencies.js";
import {
  validateSignUp,
  validateWorkspaceInfo,
  validateStaffInvite,
  executeOnboardingPipeline
} from "../../public/js/onboarding.js";
import {
  User,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  DollarSign,
  Mail,
  Phone,
  ShieldCheck,
  ChevronLeft,
  X
} from "lucide-react";

export function OnboardingFlowModal({
  isOpen,
  onClose,
  onCompleteOnboarding,
  saveWorkspaceFn,
  saveMembersFn,
  saveCurrentUserFn
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Signup, 2: Workspace, 3: Staff Invites, 4: Confirmation
  const [errorMsg, setErrorMsg] = useState("");

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

  // Step 1 Submission
  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const validated = validateSignUp(signUpForm);
      setCurrentStep(2);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Step 2 Submission
  const handleWorkspaceSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const validated = validateWorkspaceInfo(workspaceForm);
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
          staffInvites: staffToInvite
        },
        {
          saveWorkspaceFn,
          saveMembersFn,
          saveCurrentUserFn
        }
      );

      setCreatedResult(result);
      setCurrentStep(4);
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
    <div className="fixed inset-0 z-50 bg-[#1c1b19]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-8 relative">
        <TornCard headerColor="bg-[#1c1b19]" tornBottom={true}>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[#d9d4c8]/60 mb-5">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-[#1c1b19] tracking-tight">
                snapsme
              </span>
              <span className="text-[11px] font-mono bg-[#0f7a52]/10 text-[#0f7a52] px-2 py-0.5 rounded-full font-bold">
                Owner Onboarding
              </span>
            </div>

            <div className="flex items-center gap-3">
              {currentStep <= 3 && (
                <span className="step-indicator-text text-xs">
                  Step {currentStep} of 3
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-[#6b665c] hover:text-[#1c1b19] p-1 rounded-lg hover:bg-[#f7f3ea] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-4 flex items-start gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Owner Signup */}
          {currentStep === 1 && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#ff5a3c]/10 text-[#ff5a3c] flex items-center justify-center mx-auto mb-2">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-xl text-[#1c1b19]">
                  Create Your Owner Account
                </h2>
                <p className="text-xs text-[#6b665c]">
                  Get started managing team expenses with real-time receipt capture
                </p>
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-[#1c1b19] mb-1">
                  Full Name <span className="text-[#ff5a3c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signUpForm.displayName}
                  onChange={(e) => setSignUpForm({ ...signUpForm, displayName: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="form-input-snapsme"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-[#1c1b19] mb-1">
                  Email or Phone Number <span className="text-[#ff5a3c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signUpForm.emailOrPhone}
                  onChange={(e) => setSignUpForm({ ...signUpForm, emailOrPhone: e.target.value })}
                  placeholder="e.g. alex@acmetrading.com or +1 555-0192"
                  className="form-input-snapsme"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-[#1c1b19] mb-1">
                  Password <span className="text-[#6b665c] font-normal">(for login)</span>
                </label>
                <input
                  type="password"
                  value={signUpForm.password}
                  onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="form-input-snapsme"
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-ledger-green w-full py-3">
                  <span>Continue to Workspace Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Create Business Workspace */}
          {currentStep === 2 && (
            <form onSubmit={handleWorkspaceSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-semibold text-[#6b665c] hover:text-[#1c1b19] flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>

              <div className="text-center space-y-1 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#0f7a52]/10 text-[#0f7a52] flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-xl text-[#1c1b19]">
                  Create Business Workspace
                </h2>
                <p className="text-xs text-[#6b665c]">
                  Configure workspace defaults for your team (2–10 staff)
                </p>
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-[#1c1b19] mb-1">
                  Business or Team Name <span className="text-[#ff5a3c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={workspaceForm.name}
                  onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                  placeholder="e.g. Acme Trading Co."
                  className="form-input-snapsme"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-[#1c1b19] mb-1">
                  Default Accounting Currency <span className="text-[#ff5a3c]">*</span>
                </label>
                <select
                  value={workspaceForm.currency}
                  onChange={(e) => setWorkspaceForm({ ...workspaceForm, currency: e.target.value })}
                  className="form-input-snapsme cursor-pointer max-h-48"
                >
                  {WORLD_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {getCurrencyLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#f7f3ea] border border-[#d9d4c8] rounded-xl text-xs text-[#6b665c] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0f7a52] shrink-0 mt-0.5" />
                <span>
                  You will be assigned as primary <strong>Owner</strong>. You can change budget caps and manage team roles anytime in Settings.
                </span>
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-ledger-green w-full py-3">
                  <span>Continue to Invite Staff</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Invite Staff (Optional & Skippable) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-semibold text-[#6b665c] hover:text-[#1c1b19] flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-xs text-[#6b665c] italic">Optional step</span>
              </div>

              <div className="text-center space-y-1 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#e0982a]/10 text-[#e0982a] flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-xl text-[#1c1b19]">
                  Invite Team Staff
                </h2>
                <p className="text-xs text-[#6b665c]">
                  Add staff members who will submit receipt photos or voice notes
                </p>
              </div>

              {/* Staff Input Row */}
              <div className="bg-[#f7f3ea] p-3 rounded-xl border border-[#d9d4c8] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={inviteInput.displayName}
                    onChange={(e) => setInviteInput({ ...inviteInput, displayName: e.target.value })}
                    placeholder="Staff name (e.g. Marcus)"
                    className="form-input-snapsme py-1.5 text-xs"
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
                    className="form-input-snapsme py-1.5 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddInviteItem}
                  className="btn-secondary-paper w-full py-1.5 text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Staff Invitation
                </button>
              </div>

              {/* Pending Invites List */}
              {invitedStaffList.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="text-[11px] font-mono font-bold text-[#6b665c]">
                    Invited Staff ({invitedStaffList.length}):
                  </span>
                  {invitedStaffList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white border border-[#d9d4c8] rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#0f7a52]" />
                        <span className="font-bold text-[#1c1b19]">
                          {item.displayName || item.email || item.phone}
                        </span>
                        <span className="text-[10px] font-mono text-[#6b665c]">
                          ({item.email || item.phone})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
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
                  className="btn-secondary-paper flex-1 py-2.5 text-xs text-[#6b665c] text-center"
                >
                  Skip for now, I'll invite later
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalizeOnboarding(false)}
                  className="btn-ledger-green flex-1 py-2.5 text-xs"
                >
                  Create & Finish Setup ({invitedStaffList.length} staff)
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation & Handoff */}
          {currentStep === 4 && createdResult && (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-[#0f7a52]/10 text-[#0f7a52] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h2 className="font-display font-bold text-2xl text-[#1c1b19]">
                  Your Workspace is Ready!
                </h2>
                <p className="text-xs text-[#6b665c] mt-1">
                  Workspace <strong>"{createdResult.workspace.name}"</strong> has been created with default currency <strong>{createdResult.workspace.currency}</strong>.
                </p>
              </div>

              <div className="bg-[#f7f3ea] p-4 rounded-xl border border-[#d9d4c8] text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#d9d4c8]">
                  <span className="text-[#6b665c]">Workspace ID:</span>
                  <span className="font-mono font-bold text-[#1c1b19]">{createdResult.workspace.businessId}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#d9d4c8]">
                  <span className="text-[#6b665c]">Owner Role:</span>
                  <span className="font-bold text-[#0f7a52]">{createdResult.ownerMember.displayName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6b665c]">Initial Members:</span>
                  <span className="font-bold text-[#1c1b19]">{createdResult.members.length} member(s)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLaunchApp}
                className="btn-snap-coral w-full py-3 font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Launch Workspace Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </TornCard>
      </div>
    </div>
  );
}
