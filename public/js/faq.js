/**
 * SnapSME FAQs Page Logic
 * Accordion Toggles, Category Anchor Scroll, & Live Search Filter
 * Plain Vanilla JavaScript ES Module
 */

document.addEventListener("DOMContentLoaded", () => {
  initFaqAccordion();
  initFaqSearch();
  initCategoryNavHighlight();
});

function initFaqAccordion() {
  const faqHeaders = document.querySelectorAll(".faq-header");

  faqHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const faqCard = header.closest(".faq-card");
      if (!faqCard) return;

      const answer = faqCard.querySelector(".faq-answer");
      const icon = header.querySelector(".faq-icon");
      const isExpanded = faqCard.classList.contains("expanded");

      // Close all other open FAQ cards for a clean accordion feel
      document.querySelectorAll(".faq-card.expanded").forEach((openCard) => {
        if (openCard !== faqCard) {
          openCard.classList.remove("expanded");
          const openAnswer = openCard.querySelector(".faq-answer");
          const openIcon = openCard.querySelector(".faq-icon");
          if (openAnswer) openAnswer.style.maxHeight = null;
          if (openIcon) openIcon.style.transform = "rotate(0deg)";
        }
      });

      // Toggle current card
      if (isExpanded) {
        faqCard.classList.remove("expanded");
        if (answer) answer.style.maxHeight = null;
        if (icon) icon.style.transform = "rotate(0deg)";
      } else {
        faqCard.classList.add("expanded");
        if (answer) answer.style.maxHeight = answer.scrollHeight + "px";
        if (icon) icon.style.transform = "rotate(180deg)";
      }
    });
  });
}

function initFaqSearch() {
  const searchInput = document.getElementById("faq-search-input");
  const categorySections = document.querySelectorAll(".faq-category-section");
  const noResultsBox = document.getElementById("faq-no-results");

  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    let totalVisibleQuestions = 0;

    categorySections.forEach((section) => {
      const cards = section.querySelectorAll(".faq-card");
      let visibleInSection = 0;

      cards.forEach((card) => {
        const questionText = card.querySelector(".faq-question")?.textContent.toLowerCase() || "";
        const matches = !query || questionText.includes(query);

        if (matches) {
          card.classList.remove("hidden");
          visibleInSection++;
          totalVisibleQuestions++;
        } else {
          card.classList.add("hidden");
          // Collapse answer if hidden
          card.classList.remove("expanded");
          const answer = card.querySelector(".faq-answer");
          const icon = card.querySelector(".faq-icon");
          if (answer) answer.style.maxHeight = null;
          if (icon) icon.style.transform = "rotate(0deg)";
        }
      });

      if (visibleInSection > 0) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    });

    if (noResultsBox) {
      if (query && totalVisibleQuestions === 0) {
        noResultsBox.classList.remove("hidden");
      } else {
        noResultsBox.classList.add("hidden");
      }
    }
  });
}

function initCategoryNavHighlight() {
  const links = document.querySelectorAll(".faq-category-link");
  const sections = document.querySelectorAll(".faq-category-section");

  if (!links.length || !sections.length) return;

  // Smooth scroll offset adjustment on anchor click
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        const targetSection = document.querySelector(href);
        if (targetSection) {
          e.preventDefault();
          const targetOffset = targetSection.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: targetOffset, behavior: "smooth" });
        }
      }
    });
  });

  // Active section indicator on scroll
  window.addEventListener("scroll", () => {
    let currentSectionId = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.clientHeight;
      if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute("id");
      }
    });

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === `#${currentSectionId}`) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });
}
