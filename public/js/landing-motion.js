/**
 * SnapSME Landing Page Motion Engine
 * --------------------------------------------------------------------------
 * Handles scroll-triggered reveals, hero entrance stagger, card stacking,
 * live feed activity pulse, and respects OS prefers-reduced-motion settings.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Respect OS Prefers Reduced Motion Settings
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    console.log("[SnapSME Motion] Reduced motion preference detected. Animations disabled.");
    return;
  }

  // Flag motion ready state for CSS selectors
  document.body.classList.add("motion-ready");

  // 2. Hero Load Entrance Sequence (Immediately Visible Content)
  initHeroEntrance();

  // 3. Scroll-Triggered Section Reveals & Card Stacking
  initScrollReveals();

  // 4. Product Preview Live Feed Activity
  initLiveFeedMotion();
});

/**
 * Hero Load Entrance Sequence
 */
function initHeroEntrance() {
  const headline = document.querySelector(".hero-headline");
  const subtext = document.querySelector(".hero-subtext");
  const ctaWrapper = document.querySelector(".hero-cta-wrapper");
  const decorItems = document.querySelectorAll(".hero-decor-item");

  if (headline) headline.classList.add("hero-load-init");
  if (subtext) subtext.classList.add("hero-load-init");
  if (ctaWrapper) ctaWrapper.classList.add("hero-load-init");

  // Stagger hero receipt & coin illustrations after main text
  decorItems.forEach((decor, index) => {
    const delay = 420 + index * 130;
    decor.style.setProperty("--decor-delay", `${delay}ms`);
    decor.classList.add("hero-load-decor");
  });
}

/**
 * Scroll-Triggered Section Reveals via IntersectionObserver
 */
function initScrollReveals() {
  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -8% 0px",
    threshold: 0.12,
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-active");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Target elements requiring scroll reveals
  const revealTargets = document.querySelectorAll(
    ".reveal-fade-up, .reveal-scale-up, .reveal-stagger-card, .reveal-arrow"
  );

  revealTargets.forEach((target) => {
    revealObserver.observe(target);
  });

  // Stagger card indices for grouped elements
  const staggerGroups = [
    document.querySelectorAll(".diagram-step-card"),
    document.querySelectorAll(".features-grid > div"),
    document.querySelectorAll(".preview-feed-item"),
  ];

  staggerGroups.forEach((group) => {
    group.forEach((card, index) => {
      card.style.setProperty("--stagger-index", index.toString());
    });
  });

  // Connectors follow adjacent step cards
  const arrowConnectors = document.querySelectorAll(".diagram-arrow-connector");
  arrowConnectors.forEach((arrow, index) => {
    arrow.style.setProperty("--stagger-index", (index + 1).toString());
  });
}

/**
 * Product Preview Live Feed Motion & Pulse
 * Interval only runs while the preview card is on-screen and the tab is visible.
 */
function initLiveFeedMotion() {
  const activeMembersHeader = document.querySelector(".preview-card-header");
  if (activeMembersHeader) {
    const greenDot = activeMembersHeader.querySelector("span[style*='background-color: #1a9c6b']");
    if (greenDot) {
      greenDot.classList.add("live-status-dot-pulse");
    }
  }

  const feedItems = document.querySelectorAll(".preview-feed-item");
  if (feedItems.length === 0) return;

  const previewRoot =
    document.querySelector(".product-preview-section") ||
    document.querySelector(".product-preview-card");

  let flashIndex = 0;
  let timerId = null;

  const tick = () => {
    if (document.hidden) return;
    const targetItem = feedItems[flashIndex % feedItems.length];
    if (targetItem) {
      targetItem.classList.add("feed-activity-flash");
      setTimeout(() => {
        targetItem.classList.remove("feed-activity-flash");
      }, 850);
    }
    flashIndex++;
  };

  const start = () => {
    if (timerId != null) return;
    timerId = window.setInterval(tick, 7000);
  };
  const stop = () => {
    if (timerId == null) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!previewRoot || previewRoot.dataset.inView === "1") start();
  });

  if (previewRoot && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        previewRoot.dataset.inView = visible ? "1" : "0";
        if (visible && !document.hidden) start();
        else stop();
      },
      { root: null, threshold: 0.15 }
    );
    io.observe(previewRoot);
  } else {
    start();
  }
}
