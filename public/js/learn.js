/**
 * SnapSME Learn Hub Client-Side Filtering & Search Logic
 * Plain Vanilla JavaScript ES Module
 */

export function initLearnHub() {
  const searchInput = document.getElementById("learn-search-input");
  const categoryBtns = document.querySelectorAll(".learn-cat-btn");
  const articleCards = document.querySelectorAll(".learn-article-card");
  const emptyState = document.getElementById("learn-empty-state");

  if (!articleCards.length) return;

  let activeCategory = "All";
  let searchQuery = "";

  function filterArticles() {
    let visibleCount = 0;

    articleCards.forEach((card) => {
      const title = card.getAttribute("data-title") || "";
      const summary = card.getAttribute("data-summary") || "";
      const category = card.getAttribute("data-category") || "";

      const matchesCategory = activeCategory === "All" || category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch = !searchQuery || title.includes(searchQuery) || summary.includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = "flex";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterArticles();
    });
  }

  // Category tab buttons handler
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach((b) => {
        b.classList.remove("active");
        b.style.backgroundColor = "#ffffff";
        b.style.color = "#1c1b19";
        b.style.borderColor = "rgba(0,0,0,0.1)";
      });

      btn.classList.add("active");
      btn.style.backgroundColor = "#0075de";
      btn.style.color = "#ffffff";
      btn.style.borderColor = "#0075de";

      activeCategory = btn.getAttribute("data-category") || "All";
      filterArticles();
    });
  });
}

// Auto-initialize when loaded
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initLearnHub();
  });
}
