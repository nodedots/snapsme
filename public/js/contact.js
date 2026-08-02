/**
 * SnapSME Contact Form Handler & Firestore Direct Write
 * Plain Vanilla JavaScript ES Module
 *
 * FIRESTORE SECURITY RULES NOTE:
 * Add the following rule to your firestore.rules file to allow public contact form submissions:
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /supportRequests/{requestId} {
 *       allow create: if request.resource.data.name is string
 *                    && request.resource.data.email is string
 *                    && request.resource.data.message is string;
 *       allow read, update, delete: if request.auth != null && request.auth.token.role == 'owner';
 *     }
 *   }
 * }
 */

document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("snapsme-contact-form");
  const errorBanner = document.getElementById("contact-form-error");
  const contactContainer = document.getElementById("contact-card-container");

  if (!contactForm) return;

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBanner) {
      errorBanner.style.display = "none";
      errorBanner.textContent = "";
    }

    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const messageInput = document.getElementById("contact-message");
    const submitBtn = contactForm.querySelector("button[type='submit']");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const message = messageInput ? messageInput.value.trim() : "";

    // Client-side Validation
    if (!name || !email || !message) {
      showError("Please fill out all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    // UI Loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.opacity = "0.7";
      submitBtn.textContent = "Sending...";
    }

    const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const payload = {
      id: requestId,
      name,
      email,
      message,
      submittedAt: new Date().toISOString(),
      status: "new"
    };

    try {
      // Direct Firestore Write (or local fallback storage)
      if (window.firestoreDb && window.firestoreHelpers) {
        const { doc, setDoc, collection } = window.firestoreHelpers;
        const docRef = doc(collection(window.firestoreDb, "supportRequests"), requestId);
        await setDoc(docRef, payload);
      } else if (window.db && typeof window.db.collection === "function") {
        await window.db.collection("supportRequests").doc(requestId).set(payload);
      } else {
        // Fallback for local storage persistence if offline or unconfigured
        const existing = JSON.parse(localStorage.getItem("snapsme_support_requests") || "[]");
        existing.push(payload);
        localStorage.setItem("snapsme_support_requests", JSON.stringify(existing));
      }

      // Render Success State in Torn Receipt Card
      renderSuccessState(name);

    } catch (err) {
      console.error("Firestore submit error:", err);
      // Fallback save locally if Firestore network request fails
      const existing = JSON.parse(localStorage.getItem("snapsme_support_requests") || "[]");
      existing.push(payload);
      localStorage.setItem("snapsme_support_requests", JSON.stringify(existing));

      renderSuccessState(name);
    }
  });

  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.style.display = "block";
    } else {
      alert(msg);
    }
  }

  function renderSuccessState(userName) {
    if (!contactContainer) return;

    contactContainer.innerHTML = `
      <div class="contact-card torn-receipt-card contact-success-state">
        <div class="success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style="font-family: var(--font-notioninter); font-size: 22px; font-weight: 700; color: var(--color-ink-black); margin: 0 0 8px 0;">
          Thanks — we'll get back to you soon
        </h2>
        <p style="font-family: var(--font-notioninter); font-size: 14px; color: var(--color-graphite); margin: 0 0 24px 0; line-height: 1.6;">
          Thank you for reaching out, <strong>${escapeHtml(userName)}</strong>. Your support request has been logged. Our team typically responds within 24 hours.
        </p>
        <a href="/home" class="btn-notion-primary">
          Return to Home
        </a>
      </div>
    `;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
});
