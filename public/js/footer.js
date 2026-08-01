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
          <a href="/home" class="snapsme-footer-wordmark">
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
            <li><a href="/?auth=signin" class="snapsme-footer-link">Sign in</a></li>
          </ul>
        </div>

        <!-- Middle Column 2: Support -->
        <div class="snapsme-footer-col">
          <h4 class="snapsme-footer-col-title">Support</h4>
          <ul class="snapsme-footer-links">
            <li><a href="/help.html" class="snapsme-footer-link">Help Center</a></li>
            <li><a href="/contact.html" class="snapsme-footer-link">Contact Us</a></li>
          </ul>
        </div>

        <!-- Middle Column 3: Legal -->
        <div class="snapsme-footer-col">
          <h4 class="snapsme-footer-col-title">Legal</h4>
          <ul class="snapsme-footer-links">
            <li><a href="/privacy.html" class="snapsme-footer-link">Privacy Policy</a></li>
            <li><a href="/terms.html" class="snapsme-footer-link">Terms of Service</a></li>
            <li><a href="/cookies.html" class="snapsme-footer-link">Cookie Policy</a></li>
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
      </div>
    </div>
  </footer>
  `;

  let elem = document.getElementById(targetId);
  if (!elem) {
    elem = document.createElement("div");
    elem.id = targetId;
    document.body.appendChild(elem);
  }
  elem.innerHTML = html;
}

// Auto-render if imported directly in non-module scripts
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderFooter());
  } else {
    renderFooter();
  }
}
