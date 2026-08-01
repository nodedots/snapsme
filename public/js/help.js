/**
 * SnapSME Help Center FAQ Accordion Logic
 * Plain Vanilla JavaScript ES Module
 */

document.addEventListener("DOMContentLoaded", () => {
  const faqHeaders = document.querySelectorAll(".faq-header");

  faqHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const faqCard = header.closest(".faq-card");
      const answer = faqCard.querySelector(".faq-answer");
      const icon = header.querySelector(".faq-icon");
      const isExpanded = faqCard.classList.contains("expanded");

      // Close all other open FAQ cards for a clean single-open accordion feel
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
});
