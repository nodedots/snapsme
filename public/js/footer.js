/**
 * SnapSME Reusable Footer Component
 * Plain Vanilla JavaScript ES Module / DOM Renderer
 */

export function renderFooter(targetId = "snapsme-footer") {
  const currentYear = new Date().getFullYear();
  const html = `
  <footer class="snapsme-footer-component">
    <div class="snapsme-footer-container">
      <div class="snapsme-footer-grid">
        <!-- Left Column: Wordmark & Tagline -->
        <div class="snapsme-footer-brand">
          <a href="/" class="snapsme-footer-wordmark">
            <span class="snapsme-logo-icon" style="overflow: hidden; border-radius: 8px;">
              <img src="/logo.jpg" alt="SnapSME Logo" style="width: 100%; height: 100%; object-fit: cover;" />
            </span>
            <span>Snap<span style="color: var(--color-notion-blue);">SME</span></span>
          </a>
          <p class="snapsme-footer-tagline">Never lose track of team spend again</p>
        </div>

        <!-- Middle Column 1: Product -->
        <div class="snapsme-footer-col">
          <h4 class="snapsme-footer-col-title">Product</h4>
          <ul class="snapsme-footer-links">
            <li><a href="/home#how-it-works" class="snapsme-footer-link">How it works</a></li>
            <li><a href="/home#features" class="snapsme-footer-link">Features</a></li>
            <li><a href="/learn/" class="snapsme-footer-link">Learn & Guides</a></li>
            <li><a href="/about" class="snapsme-footer-link">About</a></li>
            <li><a href="/faq" class="snapsme-footer-link">FAQs</a></li>
            <li><a href="/app?auth=signin" class="snapsme-footer-link">Sign in</a></li>
          </ul>
        </div>

        <!-- Middle Column 2: Support -->
        <div class="snapsme-footer-col">
          <h4 class="snapsme-footer-col-title">Support</h4>
          <ul class="snapsme-footer-links">
            <li><a href="/help" class="snapsme-footer-link">Help Center</a></li>
            <li><a href="/contact" class="snapsme-footer-link">Contact Us</a></li>
          </ul>
        </div>

        <!-- Middle Column 3: Legal -->
        <div class="snapsme-footer-col">
          <h4 class="snapsme-footer-col-title">Legal</h4>
          <ul class="snapsme-footer-links">
            <li><a href="/privacy" class="snapsme-footer-link">Privacy Policy</a></li>
            <li><a href="/terms" class="snapsme-footer-link">Terms of Service</a></li>
            <li><a href="/cookies" class="snapsme-footer-link">Cookie Policy</a></li>
          </ul>
        </div>

        <!-- Right Column: Social Icons -->
        <div class="snapsme-footer-social">
          <h4 class="snapsme-footer-col-title">Connect</h4>
          <div class="snapsme-social-icons">
            <a href="#" aria-label="X (Twitter)" class="snapsme-social-icon" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4l11.733 16h4.267l-11.733 -16z"/>
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn" class="snapsme-social-icon" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            <a href="#" aria-label="Instagram" class="snapsme-social-icon" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="snapsme-footer-bottom">
        <p class="snapsme-copyright">&copy; ${currentYear} SnapSME. All rights reserved.</p>
        <p class="snapsme-developer-credit">
          Built by <button type="button" id="nodedots-modal-trigger" class="nodedots-trigger-link" aria-haspopup="dialog" aria-expanded="false">NodeDots</button>
        </p>
      </div>
    </div>
  </footer>

  <!-- NodeDots Developer Modal -->
  <div id="nodedots-developer-modal" class="nodedots-modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="nodedots-modal-title">
    <div class="nodedots-modal-card">
      
      <!-- Modal Header -->
      <div class="nodedots-modal-header">
        <div class="nodedots-modal-profile">
          <div class="nodedots-avatar-frame">
            <img src="/nodedots.png" onerror="this.onerror=null; this.src='/image/nodedots.png';" alt="NodeDots" class="nodedots-avatar-img" />
          </div>
          <div>
            <h3 id="nodedots-modal-title" class="nodedots-developer-name">NodeDots</h3>
            <span class="nodedots-developer-tag">Developer</span>
          </div>
        </div>

        <button type="button" id="nodedots-modal-close" class="nodedots-modal-close-btn" aria-label="Close Developer Modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Modal Bio Text -->
      <p class="nodedots-modal-bio">
        Builder of small, useful tools for real problems — SnapSME is one of them. Focused on AI integration and full-stack products that solve something specific rather than everything at once.
      </p>

      <!-- Social / Support Links List -->
      <div class="nodedots-links-list">
        
        <!-- 1. Ko-fi (Warm Coral Accent Highlight) -->
        <a href="https://ko-fi.com/nodedots" target="_blank" rel="noopener noreferrer" class="nodedots-link-row nodedots-kofi-row" aria-label="Support on Ko-fi">
          <div class="nodedots-link-left">
            <svg class="nodedots-link-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.441-.679.441s-.25 3.327.244 8.784c.664 7.34 5.922 8.783 5.922 8.783h9.617s4.41-.301 6.002-4.512c1.782-4.717 2.052-8.903 2.052-8.903zm-5.743 5.105c-1.077 2.846-3.879 3.006-3.879 3.006H6.182s-3.551-1.026-3.998-5.986c-.33-3.666-.17-5.91-.17-5.91h15.077s2.772.35 3.298 3.518c.381 2.298.17 3.865-.251 5.372zM18.89 8.232c.119 1.139-.06 2.502-.45 3.535-.619 1.637-1.89 1.9-1.89 1.9h-1.86s.76-.879.91-2.146c.15-1.267.09-3.289.09-3.289s2.441.13 3.2 0z"/>
            </svg>
            <span class="nodedots-link-label">Support on Ko-fi</span>
          </div>
          <span class="nodedots-link-handle">ko-fi.com/nodedots</span>
        </a>

        <!-- 2. X (Twitter) -->
        <a href="https://x.com/nodedots" target="_blank" rel="noopener noreferrer" class="nodedots-link-row" aria-label="X (Twitter)">
          <div class="nodedots-link-left">
            <svg class="nodedots-link-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span class="nodedots-link-label">X (Twitter)</span>
          </div>
          <span class="nodedots-link-handle">@nodedots</span>
        </a>

        <!-- 3. Portfolio -->
        <a href="https://nodedots.co" target="_blank" rel="noopener noreferrer" class="nodedots-link-row" aria-label="Portfolio">
          <div class="nodedots-link-left">
            <svg class="nodedots-link-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span class="nodedots-link-label">Portfolio</span>
          </div>
          <span class="nodedots-link-handle">nodedots.co</span>
        </a>

        <!-- 4. Telegram -->
        <a href="https://t.me/nodedots" target="_blank" rel="noopener noreferrer" class="nodedots-link-row" aria-label="Telegram">
          <div class="nodedots-link-left">
            <svg class="nodedots-link-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.762-.168.708-.431.944-.683.967-.547.05-.963-.36-1.492-.707-.828-.543-1.296-.88-2.102-1.411-.93-.613-.327-.95.203-1.501.139-.144 2.548-2.336 2.595-2.535.006-.025.01-.118-.045-.167-.054-.049-.134-.032-.192-.019-.082.019-1.396.888-3.942 2.607-.373.256-.711.381-1.014.374-.334-.007-.977-.189-1.455-.344-.586-.19-1.052-.291-1.011-.614.021-.168.256-.34.704-.515 2.766-1.205 4.612-2.001 5.539-2.387 2.637-1.099 3.183-1.29 3.54-1.297.078-.001.253.018.367.111.096.079.123.186.136.262.015.093.031.297.016.459z"/>
            </svg>
            <span class="nodedots-link-label">Telegram</span>
          </div>
          <span class="nodedots-link-handle">@nodedots</span>
        </a>

      </div>

    </div>
  </div>
  `;

  let elem = document.getElementById(targetId);
  if (!elem) {
    elem = document.createElement("div");
    elem.id = targetId;
    document.body.appendChild(elem);
  }
  elem.innerHTML = html;

  // Setup Developer Modal Listeners
  initDeveloperModal();
}

let activeTriggerElem = null;

function initDeveloperModal() {
  const triggerBtn = document.getElementById("nodedots-modal-trigger");
  const modalBackdrop = document.getElementById("nodedots-developer-modal");
  const closeBtn = document.getElementById("nodedots-modal-close");

  if (!triggerBtn || !modalBackdrop) return;

  function openModal() {
    activeTriggerElem = document.activeElement;
    modalBackdrop.classList.remove("hidden");
    triggerBtn.setAttribute("aria-expanded", "true");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    modalBackdrop.classList.add("hidden");
    triggerBtn.setAttribute("aria-expanded", "false");
    if (activeTriggerElem && typeof activeTriggerElem.focus === "function") {
      activeTriggerElem.focus();
    }
  }

  triggerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) {
      closeModal();
    }
  });
}

// Auto-render if imported directly in non-module scripts
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderFooter());
  } else {
    renderFooter();
  }
}

