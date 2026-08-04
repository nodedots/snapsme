/**
 * SnapSME — About Page Script
 * Interactivity & Developer Modal Handoff
 */

import { renderHeader } from "./header.js";
import { renderFooter } from "./footer.js";

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();

  // Attach click trigger to Developer profile card to open the NodeDots modal
  const aboutDevTrigger = document.getElementById("about-nodedots-trigger");
  if (aboutDevTrigger) {
    aboutDevTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      const modalTrigger = document.getElementById("nodedots-modal-trigger");
      if (modalTrigger) {
        modalTrigger.click();
      }
    });
  }
});
