/**
 * SnapSME Reusable Header Component for Non-App Pages
 * Plain Vanilla JavaScript ES Module / DOM Renderer
 *
 * Performance: Firebase Auth is NOT imported at module top-level.
 * Marketing pages paint the header immediately; auth/Firebase load lazily
 * after first paint (or on Sign-in click), so learn/about/faq don't block
 * on the Firebase CDN before showing content.
 */

let authModulePromise = null;
let authListenerBound = false;

/** Lazy-load auth.js + Firebase only when needed. */
function loadAuthModule() {
  if (!authModulePromise) {
    authModulePromise = import("./auth.js");
  }
  return authModulePromise;
}

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

function readCachedUser() {
  try {
    const cached = localStorage.getItem("snapsme_current_user");
    if (cached) return JSON.parse(cached);
  } catch (e) {
    /* ignore */
  }
  return null;
}

function paintHeader(container, { user, status }) {
  const isSignedIn = Boolean(user && (user.uid || user.userId || user.email));
  const wasOnboardedLocally =
    localStorage.getItem("snapsme_onboarding_completed") === "true" ||
    localStorage.getItem("snapsme_onboarding_skipped") === "true" ||
    Boolean(localStorage.getItem("snapsme_workspace"));

  const isFullyOnboarded =
    (status?.hasMemberDoc && status?.hasWorkspace) || wasOnboardedLocally;

  const primaryBtnText = isFullyOnboarded ? "Go to Workspace" : "Continue Setup";
  const primaryBtnHref = isFullyOnboarded ? "/app" : "/?onboarding=true";

  const displayName = user?.displayName || user?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const photoURL = user?.photoURL || null;
  const initials = getInitials(displayName);

  container.innerHTML = `
  <div class="snapsme-header-wrapper" style="background-color: var(--color-paper-warmth); border-bottom: var(--border-hairline); width: 100%; position: relative;">
    <div class="snapsme-landing-container">
      <header class="snapsme-nav" style="position: relative; display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <a href="/" class="snapsme-wordmark" style="flex-shrink: 0;">
          <span class="snapsme-logo-icon" style="overflow: hidden; border-radius: 8px;">
            <img src="/logo.jpg" alt="SnapSME Logo" width="32" height="32" style="width: 100%; height: 100%; object-fit: cover;" decoding="async" />
          </span>
          <span>Snap<span style="color: var(--color-notion-blue);">SME</span></span>
        </a>

        <nav class="snapsme-nav-links desktop-only" style="display: flex; align-items: center; gap: 24px; position: absolute; left: 50%; transform: translateX(-50%);">
          <a href="/#features" class="snapsme-nav-link">Features</a>
          <a href="/#how-it-works" class="snapsme-nav-link">How it works</a>
          <a href="/learn/" class="snapsme-nav-link">Learn</a>
          <a href="/about" class="snapsme-nav-link">About</a>
          <a href="/faq" class="snapsme-nav-link">FAQs</a>
        </nav>

        <div class="snapsme-header-actions desktop-only" style="display: flex; align-items: center; gap: 16px; margin-left: auto;">
          ${isSignedIn ? `
            <a href="${primaryBtnHref}" class="btn-ledger-primary">
              <span>${primaryBtnText}</span>
            </a>
            <div style="position: relative;" id="snapsme-avatar-menu-wrapper">
              <button id="snapsme-avatar-btn" class="snapsme-avatar-circle" aria-label="User account menu">
                ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="snapsme-avatar-img" decoding="async" />` : `<span>${initials}</span>`}
              </button>
              <div id="snapsme-user-dropdown" class="snapsme-user-dropdown hidden">
                <div style="padding: 10px 16px; border-bottom: 1px solid var(--color-fiber-gray); font-family: var(--font-notioninter);">
                  <div style="font-weight: 600; font-size: 14px; color: #1c1b19; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(displayName)}</div>
                  ${email ? `<div style="font-size: 12px; color: #6b665c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">${escapeHtml(email)}</div>` : ""}
                </div>
                <a href="/app?view=settings" class="snapsme-dropdown-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Settings</span>
                </a>
                <button type="button" id="snapsme-signout-btn" class="snapsme-dropdown-item" style="color: var(--color-vermillion);">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ` : `
            <button type="button" class="btn-notion-ghost" id="snapsme-nav-login-btn">
              <span>Sign in</span>
            </button>
            <a href="/app?onboarding=true" class="btn-ledger-primary">
              <span>Create Workspace</span>
            </a>
          `}
        </div>

        <button type="button" class="mobile-menu-btn" id="snapsme-mobile-menu-btn" aria-label="Toggle navigation menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>
    </div>
  </div>

  <div id="mobile-menu-overlay" class="mobile-nav-overlay hidden">
    <div class="mobile-nav-content">
      <a href="/#features" class="mobile-nav-link mobile-close-trigger">Features</a>
      <a href="/#how-it-works" class="mobile-nav-link mobile-close-trigger">How it works</a>
      <a href="/learn/" class="mobile-nav-link mobile-close-trigger">Learn</a>
      <a href="/about" class="mobile-nav-link mobile-close-trigger">About</a>
      <a href="/faq" class="mobile-nav-link mobile-close-trigger">FAQs</a>

      ${isSignedIn ? `
        <a href="${primaryBtnHref}" class="btn-ledger-primary" style="width: 100%; justify-content: center; margin-top: 8px;">
          <span>${primaryBtnText}</span>
        </a>
        <a href="/app?view=settings" class="mobile-nav-link">Settings</a>
        <button id="mobile-signout-btn" class="mobile-nav-link" style="color: #e32d14; text-align: left; background: none; border: none; font-size: 16px; padding: 12px 0; cursor: pointer; width: 100%;">
          Sign out
        </button>
      ` : `
        <button type="button" id="mobile-nav-login-btn" class="mobile-nav-link" style="text-align: left; background: none; border: none; font-size: 16px; padding: 12px 0; cursor: pointer; width: 100%;">Sign in</button>
        <div style="margin-top: 8px;">
          <a href="/app?onboarding=true" class="btn-notion-primary" style="width: 100%; justify-content: center;">
            <span>Create your workspace</span>
          </a>
        </div>
      `}
    </div>
  </div>
  `;

  attachHeaderEvents();
  updateHomePageHero(user, status);
}

export async function renderHeader(targetId = "snapsme-header") {
  const container = document.getElementById(targetId);
  if (!container) return;

  // 1) Instant paint from localStorage only — no Firebase yet
  const cachedUser = readCachedUser();
  paintHeader(container, {
    user: cachedUser,
    status: { hasMemberDoc: false, hasWorkspace: false }
  });

  // 2) After first paint, lazily resolve real auth state
  try {
    const authMod = await loadAuthModule();
    await authMod.initAuth();
    const auth = authMod.getAuthInstance();
    let user = auth ? auth.currentUser : null;
    if (!user) user = readCachedUser();

    let status = { hasMemberDoc: false, hasWorkspace: false };
    if (user) {
      status = await authMod.checkUserMemberStatus(user);
    }

    paintHeader(container, { user, status });

    if (!authListenerBound && auth) {
      authListenerBound = true;
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
      );
      onAuthStateChanged(auth, () => {
        renderHeader(targetId);
      });
    }
  } catch (err) {
    console.warn("[header] Auth upgrade deferred/failed:", err?.message || err);
  }
}

async function updateHomePageHero(user, status) {
  const heroCtaWrapper = document.querySelector(".hero-cta-wrapper");
  if (!heroCtaWrapper) return;

  if (!user) {
    user = readCachedUser();
  }

  if (!user) return;

  try {
    if (!status || (!status.hasMemberDoc && !status.hasWorkspace)) {
      const authMod = await loadAuthModule();
      status = await authMod.checkUserMemberStatus(user);
    }
  } catch {
    status = status || { hasMemberDoc: false, hasWorkspace: false };
  }

  const wasOnboardedLocally =
    localStorage.getItem("snapsme_onboarding_completed") === "true" ||
    localStorage.getItem("snapsme_onboarding_skipped") === "true";
  const isFullyOnboarded =
    (status.hasMemberDoc && status.hasWorkspace) || wasOnboardedLocally;
  const btnText = isFullyOnboarded ? "Go to Workspace" : "Continue Setup";
  const btnHref = isFullyOnboarded ? "/app" : "/?onboarding=true";

  heroCtaWrapper.innerHTML = `
    <a href="${btnHref}" class="btn-ledger-primary" style="padding: 12px 28px; font-size: 16px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
      <span>${btnText}</span>
    </a>
  `;
}

function attachHeaderEvents() {
  initMobileMenu();

  const avatarBtn = document.getElementById("snapsme-avatar-btn");
  const dropdown = document.getElementById("snapsme-user-dropdown");
  const signoutBtn = document.getElementById("snapsme-signout-btn");
  const mobileSignoutBtn = document.getElementById("mobile-signout-btn");

  const openSignIn = async (e) => {
    if (e) e.preventDefault();
    const overlay = document.getElementById("mobile-menu-overlay");
    if (overlay) overlay.classList.add("hidden");
    try {
      const authMod = await loadAuthModule();
      await authMod.initAuth();
      authMod.showAuthModal("signin");
    } catch (err) {
      console.error("[header] Failed to open sign-in:", err?.message || err);
      window.location.href = "/app?auth=signin";
    }
  };

  document
    .querySelectorAll(
      "#snapsme-nav-login-btn, #mobile-nav-login-btn, #snapsme-hero-login-btn, a[href='/?auth=signin'], button[href='/?auth=signin']"
    )
    .forEach((trigger) => {
      trigger.addEventListener("click", openSignIn);
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

  const doSignOut = async () => {
    // Optimistic: flip UI to signed-out shell immediately while sign-out runs
    try {
      localStorage.removeItem("snapsme_current_user");
    } catch (_) {
      /* ignore */
    }
    const headerRoot = document.getElementById("snapsme-header");
    if (headerRoot) {
      paintHeader(headerRoot, {
        user: null,
        status: { hasMemberDoc: false, hasWorkspace: false }
      });
    }
    try {
      const authMod = await loadAuthModule();
      await authMod.handleSignOut(); // clears session + redirects within ~350ms
    } catch (err) {
      console.error("[header] Sign out failed:", err?.message || err);
      window.location.replace("/");
    }
  };

  if (signoutBtn) signoutBtn.addEventListener("click", doSignOut);
  if (mobileSignoutBtn) mobileSignoutBtn.addEventListener("click", doSignOut);
}

function initMobileMenu() {
  const toggleBtn =
    document.getElementById("snapsme-mobile-menu-btn") ||
    document.getElementById("mobile-menu-toggle");
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
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  }
}

// Bootstrap: paint header ASAP without waiting for Firebase
if (typeof window !== "undefined") {
  const boot = () => {
    renderHeader().catch((err) => {
      console.error("[header] render failed:", err?.message || err);
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
