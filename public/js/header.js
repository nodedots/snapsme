/**
 * SnapSME Reusable Header Component for Non-App Pages
 * Plain Vanilla JavaScript ES Module / DOM Renderer
 */

export function renderHeader(targetId = "snapsme-header") {
  const html = `
  <div class="snapsme-header-wrapper" style="background-color: var(--color-paper-warmth); border-bottom: var(--border-hairline); width: 100%;">
    <div class="snapsme-landing-container">
      <header class="snapsme-nav">
        <a href="/home" class="snapsme-wordmark">
          <span class="snapsme-logo-icon" style="overflow: hidden; border-radius: 8px;">
            <img src="/logo.jpg" alt="SnapSME Logo" style="width: 100%; height: 100%; object-fit: cover;" />
          </span>
          <span>Snap<span style="color: var(--color-notion-blue);">SME</span></span>
        </a>
        
        <!-- Desktop Navigation Links -->
        <nav class="snapsme-nav-links desktop-only">
          <a href="/home#how-it-works" class="snapsme-nav-link">How it works</a>
          <a href="/home#features" class="snapsme-nav-link">Features</a>
          <a href="/?auth=signin" class="snapsme-nav-link">Sign in</a>
          <a href="/?onboarding=true" class="btn-notion-primary">
            <span>Get Started free</span>
          </a>
        </nav>

        <!-- Mobile Menu Toggle Button -->
        <button id="mobile-menu-toggle" class="mobile-menu-btn" aria-label="Toggle Navigation Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="20" y2="17"/>
          </svg>
        </button>
      </header>
    </div>
  </div>

  <!-- Mobile Slide-Down Menu Overlay -->
  <div id="mobile-menu-overlay" class="mobile-nav-overlay hidden">
    <div class="mobile-nav-content">
      <a href="/home#how-it-works" class="mobile-nav-link mobile-close-trigger">How it works</a>
      <a href="/home#features" class="mobile-nav-link mobile-close-trigger">Features</a>
      <a href="/?auth=signin" class="mobile-nav-link">Sign in</a>
      <div style="margin-top: 8px;">
        <a href="/?onboarding=true" class="btn-notion-primary" style="width: 100%; justify-content: center;">
          <span>Create your workspace</span>
        </a>
      </div>
    </div>
  </div>
  `;

  let elem = document.getElementById(targetId);
  if (elem) {
    elem.innerHTML = html;
    initMobileMenu();
  }
}

function initMobileMenu() {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const overlay = document.getElementById("mobile-menu-overlay");
  const triggers = document.querySelectorAll(".mobile-close-trigger");

  if (toggleBtn && overlay) {
    toggleBtn.addEventListener("click", () => {
      overlay.classList.toggle("hidden");
    });
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (overlay) overlay.classList.add("hidden");
    });
  });
}

// Auto-render if container exists or on DOM ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderHeader());
  } else {
    renderHeader();
  }
}
