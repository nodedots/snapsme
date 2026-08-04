/**
 * SnapSME Reusable Header Component for Non-App Pages
 * Plain Vanilla JavaScript ES Module / DOM Renderer
 * Supports Centered Nav Links & Signed-In State
 */

import { auth, checkUserMemberStatus, handleSignOut, showAuthModal } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "U";
  const str = nameOrEmail.trim();
  if (str.includes("@")) {
    return str[0].toUpperCase();
  }
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function renderHeader(targetId = "snapsme-header") {
  const container = document.getElementById(targetId);
  if (!container) return;

  // Determine authenticated user
  let user = auth.currentUser;
  if (!user) {
    const cached = localStorage.getItem("snapsme_current_user");
    if (cached) {
      try {
        user = JSON.parse(cached);
      } catch (e) {}
    }
  }

  let status = { hasMemberDoc: false, hasWorkspace: false };
  if (user) {
    status = await checkUserMemberStatus(user);
  }

  const isSignedIn = Boolean(user && (user.uid || user.userId || user.email));
  const wasOnboardedLocally =
    localStorage.getItem("snapsme_onboarding_completed") === "true" ||
    localStorage.getItem("snapsme_onboarding_skipped") === "true" ||
    Boolean(localStorage.getItem("snapsme_workspace"));

  const isFullyOnboarded = (status.hasMemberDoc && status.hasWorkspace) || wasOnboardedLocally;

  const primaryBtnText = isFullyOnboarded ? "Go to Workspace" : "Continue Setup";
  const primaryBtnHref = isFullyOnboarded ? "/" : "/?onboarding=true";

  const displayName = user?.displayName || user?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const photoURL = user?.photoURL || null;
  const initials = getInitials(displayName);

  const html = `
  <div class="snapsme-header-wrapper" style="background-color: var(--color-paper-warmth); border-bottom: var(--border-hairline); width: 100%; position: relative;">
    <div class="snapsme-landing-container">
      <header class="snapsme-nav" style="position: relative; display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <!-- Left: Brand Logo & Wordmark -->
        <a href="/home" class="snapsme-wordmark" style="flex-shrink: 0;">
          <span class="snapsme-logo-icon" style="overflow: hidden; border-radius: 8px;">
            <img src="/logo.jpg" alt="SnapSME Logo" style="width: 100%; height: 100%; object-fit: cover;" />
          </span>
          <span>Snap<span style="color: var(--color-notion-blue);">SME</span></span>
        </a>
        
        <!-- Center: Navigation Links (Centered) -->
        <nav class="snapsme-nav-links desktop-only" style="display: flex; align-items: center; gap: 24px; position: absolute; left: 50%; transform: translateX(-50%);">
          <a href="/home#features" class="snapsme-nav-link">Features</a>
          <a href="/home#how-it-works" class="snapsme-nav-link">How it works</a>
          <a href="/learn/" class="snapsme-nav-link">Learn</a>
          <a href="/about.html" class="snapsme-nav-link">About</a>
          <a href="/faq.html" class="snapsme-nav-link">FAQs</a>
        </nav>

        <!-- Right: Actions & User Menu -->
        <div class="snapsme-header-actions desktop-only" style="display: flex; align-items: center; gap: 16px; margin-left: auto;">
          ${isSignedIn ? `
            <!-- Signed-In State Nav -->
            <a href="${primaryBtnHref}" class="btn-ledger-primary">
              <span>${primaryBtnText}</span>
            </a>
            
            <div style="position: relative;" id="snapsme-avatar-menu-wrapper">
              <button id="snapsme-avatar-btn" class="snapsme-avatar-circle" aria-label="User account menu">
                ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="snapsme-avatar-img" />` : `<span>${initials}</span>`}
              </button>

              <!-- User Dropdown Menu -->
              <div id="snapsme-user-dropdown" class="snapsme-user-dropdown hidden">
                <div style="padding: 10px 16px; border-bottom: 1px solid var(--color-fiber-gray); font-family: var(--font-notioninter);">
                  <div style="font-weight: 600; font-size: 14px; color: #1c1b19; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(displayName)}</div>
                  ${email ? `<div style="font-size: 12px; color: #6b665c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">${escapeHtml(email)}</div>` : ""}
                </div>
                <a href="/?view=settings" class="snapsme-dropdown-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Settings</span>
                </a>
                <button type="button" id="snapsme-signout-btn" class="snapsme-dropdown-item" style="color: var(--color-vermillion);">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ` : `
            <!-- Logged-Out State Nav -->
            <button type="button" class="btn-notion-ghost" id="snapsme-nav-login-btn">
              <span>Sign in</span>
            </button>
            <a href="/?onboarding=true" class="btn-ledger-primary">
              <span>Create Workspace</span>
            </a>
          `}
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button type="button" class="mobile-menu-btn" id="snapsme-mobile-menu-btn" aria-label="Toggle navigation menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>
    </div>
  </div>

  <!-- Mobile Slide-Down Menu Overlay -->
  <div id="mobile-menu-overlay" class="mobile-nav-overlay hidden">
    <div class="mobile-nav-content">
      <a href="/home#features" class="mobile-nav-link mobile-close-trigger">Features</a>
      <a href="/home#how-it-works" class="mobile-nav-link mobile-close-trigger">How it works</a>
      <a href="/learn/" class="mobile-nav-link mobile-close-trigger">Learn</a>
      <a href="/about.html" class="mobile-nav-link mobile-close-trigger">About</a>
      <a href="/faq.html" class="mobile-nav-link mobile-close-trigger">FAQs</a>
      
      ${isSignedIn ? `
        <a href="${primaryBtnHref}" class="btn-ledger-primary" style="width: 100%; justify-content: center; margin-top: 8px;">
          <span>${primaryBtnText}</span>
        </a>
        <a href="/?view=settings" class="mobile-nav-link">Settings</a>
        <button id="mobile-signout-btn" class="mobile-nav-link" style="color: #e32d14; text-align: left; background: none; border: none; font-size: 16px; padding: 12px 0; cursor: pointer; width: 100%;">
          Sign out
        </button>
      ` : `
        <button type="button" id="mobile-nav-login-btn" class="mobile-nav-link" style="text-align: left; background: none; border: none; font-size: 16px; padding: 12px 0; cursor: pointer; width: 100%;">Sign in</button>
        <div style="margin-top: 8px;">
          <a href="/?onboarding=true" class="btn-notion-primary" style="width: 100%; justify-content: center;">
            <span>Create your workspace</span>
          </a>
        </div>
      `}
    </div>
  </div>
  `;

  container.innerHTML = html;
  attachHeaderEvents();
  updateHomePageHero(user, status);
}

async function updateHomePageHero(user, status) {
  const heroCtaWrapper = document.querySelector(".hero-cta-wrapper");
  if (!heroCtaWrapper) return;

  if (!user) {
    const cached = localStorage.getItem("snapsme_current_user");
    if (cached) {
      try { user = JSON.parse(cached); } catch (e) {}
    }
  }

  if (user) {
    if (!status) status = await checkUserMemberStatus(user);
    const isFullyOnboarded = status.hasMemberDoc && status.hasWorkspace;
    const btnText = isFullyOnboarded ? "Go to Workspace" : "Continue Setup";
    const btnHref = isFullyOnboarded ? "/" : "/?onboarding=true";

    heroCtaWrapper.innerHTML = `
      <a href="${btnHref}" class="btn-ledger-primary" style="padding: 12px 28px; font-size: 16px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>${btnText}</span>
      </a>
    `;
  }
}

function attachHeaderEvents() {
  initMobileMenu();

  const avatarBtn = document.getElementById("snapsme-avatar-btn");
  const dropdown = document.getElementById("snapsme-user-dropdown");
  const signoutBtn = document.getElementById("snapsme-signout-btn");
  const mobileSignoutBtn = document.getElementById("mobile-signout-btn");

  // Handle all Sign In triggers on the page (header nav & hero links)
  const signinTriggers = document.querySelectorAll(
    "#snapsme-nav-login-btn, #mobile-nav-login-btn, #snapsme-hero-login-btn, a[href='/?auth=signin'], button[href='/?auth=signin']"
  );
  signinTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const overlay = document.getElementById("mobile-menu-overlay");
      if (overlay) overlay.classList.add("hidden");
      showAuthModal("signin");
    });
  });

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
        dropdown.classList.add("hidden");
      }
    });
  }

  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      await handleSignOut();
    });
  }

  if (mobileSignoutBtn) {
    mobileSignoutBtn.addEventListener("click", async () => {
      await handleSignOut();
    });
  }
}

function initMobileMenu() {
  const toggleBtn = document.getElementById("snapsme-mobile-menu-btn") || document.getElementById("mobile-menu-toggle");
  const overlay = document.getElementById("mobile-menu-overlay");
  const triggers = document.querySelectorAll(".mobile-close-trigger");

  if (toggleBtn && overlay) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.toggle("hidden");
    });
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (overlay) overlay.classList.add("hidden");
    });
  });

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("hidden");
      }
    });
  }
}

// Global listener for auth state changes
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, () => {
    renderHeader();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderHeader());
  } else {
    renderHeader();
  }
}
