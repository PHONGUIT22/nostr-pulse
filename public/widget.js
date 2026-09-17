/**
 * NostrPulse Standalone NutZap Widget (NIP-60 / NIP-61)
 * Lightweight, zero-dependency embeddable Web Component and Script Widget.
 *
 * Usage:
 *   <script src="https://nostrpulse.com/widget.js" data-npub="npub1..." data-name="Alice" async></script>
 *
 * Web Component:
 *   <nutzap-me npub="npub1..." name="Alice" amount="100"></nutzap-me>
 */
(function () {
  if (typeof window === "undefined") return;

  // Prevent multiple executions of the root script
  if (window.__NOSTRPULSE_WIDGET_INITIALIZED__) return;
  window.__NOSTRPULSE_WIDGET_INITIALIZED__ = true;

  // Determine host origin from current script URL
  function getWidgetHost() {
    try {
      const scripts = document.querySelectorAll('script[src*="widget.js"]');
      if (scripts.length > 0) {
        const lastScript = scripts[scripts.length - 1];
        const src = lastScript.getAttribute("src") || "";
        if (src.startsWith("http://") || src.startsWith("https://")) {
          const url = new URL(src);
          return url.origin;
        }
      }
    } catch (_) {}
    return window.location.origin || "https://nostrpulse.com";
  }

  const HOST = getWidgetHost();

  // Inject Scoped Styles once
  function injectStyles() {
    if (document.getElementById("np-nutzap-styles")) return;

    const style = document.createElement("style");
    style.id = "np-nutzap-styles";
    style.textContent = `
      .np-nutzap-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #7c3aed 0%, #d97706 100%);
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
        padding: 10px 18px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        text-decoration: none !important;
        user-select: none;
      }
      .np-nutzap-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45);
        filter: brightness(1.08);
      }
      .np-nutzap-btn:active {
        transform: translateY(0);
      }
      .np-nutzap-btn svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      /* Modal Backdrop */
      .np-nutzap-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(8, 10, 15, 0.82);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: npFadeIn 0.2s ease-out;
      }

      /* Modal Card */
      .np-nutzap-card {
        background: #0f172a;
        color: #f8fafc;
        width: 100%;
        max-width: 420px;
        border-radius: 24px;
        border: 1px solid #1e293b;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow: hidden;
        position: relative;
        animation: npSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .np-nutzap-header {
        padding: 20px 24px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #1e293b;
      }
      .np-nutzap-title {
        font-size: 17px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f8fafc;
      }
      .np-nutzap-close {
        background: #1e293b;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .np-nutzap-close:hover {
        background: #334155;
        color: #ffffff;
      }

      .np-nutzap-body {
        padding: 20px 24px 24px;
      }

      .np-nutzap-subhead {
        font-size: 13px;
        color: #94a3b8;
        margin-bottom: 16px;
        line-height: 1.4;
      }
      .np-nutzap-subhead strong {
        color: #e2e8f0;
      }

      /* Presets */
      .np-nutzap-presets {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
        margin-bottom: 14px;
      }
      .np-nutzap-preset-btn {
        background: #1e293b;
        border: 1px solid #334155;
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 700;
        padding: 8px 4px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: center;
      }
      .np-nutzap-preset-btn:hover {
        background: #334155;
        color: #ffffff;
      }
      .np-nutzap-preset-btn.active {
        background: #7c3aed;
        border-color: #8b5cf6;
        color: #ffffff;
        box-shadow: 0 0 10px rgba(124, 58, 237, 0.4);
      }

      /* Inputs */
      .np-nutzap-input-group {
        margin-bottom: 14px;
      }
      .np-nutzap-label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 6px;
      }
      .np-nutzap-input {
        width: 100%;
        background: #090d16;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 10px 14px;
        color: #ffffff;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
      }
      .np-nutzap-input:focus {
        border-color: #7c3aed;
      }

      /* Submit Button */
      .np-nutzap-submit {
        width: 100%;
        background: linear-gradient(135deg, #7c3aed 0%, #d97706 100%);
        border: none;
        color: #ffffff;
        font-size: 15px;
        font-weight: 800;
        padding: 13px;
        border-radius: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
        transition: all 0.2s ease;
      }
      .np-nutzap-submit:hover:not(:disabled) {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
      .np-nutzap-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* QR View */
      .np-nutzap-qr-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .np-nutzap-qr-box {
        background: #ffffff;
        padding: 12px;
        border-radius: 16px;
        margin-bottom: 16px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }
      .np-nutzap-qr-box img {
        display: block;
        width: 200px;
        height: 200px;
      }
      .np-nutzap-actions {
        display: flex;
        gap: 8px;
        width: 100%;
        margin-bottom: 12px;
      }
      .np-nutzap-action-btn {
        flex: 1;
        background: #1e293b;
        border: 1px solid #334155;
        color: #e2e8f0;
        padding: 10px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s ease;
        text-decoration: none !important;
      }
      .np-nutzap-action-btn:hover {
        background: #334155;
        color: #ffffff;
      }
      .np-nutzap-webln-btn {
        width: 100%;
        background: #f59e0b;
        color: #0f172a;
        font-weight: 800;
        padding: 10px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .np-nutzap-webln-btn:hover {
        background: #fbbf24;
      }

      /* Polling Indicator */
      .np-nutzap-polling {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: #f59e0b;
        margin-top: 4px;
      }
      .np-nutzap-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(245, 158, 11, 0.3);
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: npSpin 0.8s linear infinite;
      }

      /* Success Screen */
      .np-nutzap-success {
        text-align: center;
        padding: 12px 0;
      }
      .np-nutzap-success-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .np-nutzap-success h4 {
        font-size: 20px;
        font-weight: 800;
        color: #34d399;
        margin: 0 0 8px 0;
      }
      .np-nutzap-success p {
        font-size: 14px;
        color: #94a3b8;
        line-height: 1.5;
        margin: 0 0 20px 0;
      }

      @keyframes npFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes npSlideUp {
        from { opacity: 0; transform: translateY(16px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes npSpin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Open NutZap Modal Dialog
  function openNutZapModal(config) {
    injectStyles();

    const npub = config.npub || "";
    const name = config.name || "Creator";
    const defaultAmount = Number(config.amount) || 100;
    const mintUrl = config.mint || "https://testnut.cashu.space";

    let currentSats = defaultAmount;
    let pollTimer = null;

    // Create Modal Elements
    const backdrop = document.createElement("div");
    backdrop.className = "np-nutzap-modal-backdrop";

    const card = document.createElement("div");
    card.className = "np-nutzap-card";

    // Close logic
    function closeModal() {
      if (pollTimer) clearInterval(pollTimer);
      backdrop.remove();
    }

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });

    // Render Step 1: Input Form
    function renderInputForm() {
      card.innerHTML = `
        <div class="np-nutzap-header">
          <div class="np-nutzap-title">
            <span>🥜</span>
            <span>NutZap with eCash</span>
          </div>
          <button class="np-nutzap-close" title="Close">&times;</button>
        </div>
        <div class="np-nutzap-body">
          <div class="np-nutzap-subhead">
            Mint & send Cashu eCash (NIP-61) directly to <strong>${escapeHtml(name)}</strong> without wallet extensions.
          </div>

          <label class="np-nutzap-label">Choose Amount (Satoshis)</label>
          <div class="np-nutzap-presets">
            <button class="np-nutzap-preset-btn ${currentSats === 21 ? "active" : ""}" data-val="21">21</button>
            <button class="np-nutzap-preset-btn ${currentSats === 100 ? "active" : ""}" data-val="100">100</button>
            <button class="np-nutzap-preset-btn ${currentSats === 500 ? "active" : ""}" data-val="500">500</button>
            <button class="np-nutzap-preset-btn ${currentSats === 1000 ? "active" : ""}" data-val="1000">1k</button>
            <button class="np-nutzap-preset-btn ${currentSats === 5000 ? "active" : ""}" data-val="5000">5k</button>
          </div>

          <div class="np-nutzap-input-group">
            <input type="number" class="np-nutzap-input np-nutzap-sats-input" min="1" value="${currentSats}" placeholder="Custom Sats" />
          </div>

          <div class="np-nutzap-input-group">
            <label class="np-nutzap-label">Memo / Note (Optional)</label>
            <input type="text" class="np-nutzap-input np-nutzap-memo-input" placeholder="Great post! 🚀" maxlength="120" />
          </div>

          <button class="np-nutzap-submit np-nutzap-start-btn">
            <span>⚡</span>
            <span>Pay & NutZap ${currentSats.toLocaleString()} Sats</span>
          </button>
        </div>
      `;

      card.querySelector(".np-nutzap-close").addEventListener("click", closeModal);

      // Preset click
      const presets = card.querySelectorAll(".np-nutzap-preset-btn");
      const satsInput = card.querySelector(".np-nutzap-sats-input");
      const submitBtn = card.querySelector(".np-nutzap-start-btn");

      presets.forEach((btn) => {
        btn.addEventListener("click", () => {
          presets.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          currentSats = Number(btn.getAttribute("data-val"));
          satsInput.value = currentSats;
          submitBtn.querySelector("span:last-child").textContent = `Pay & NutZap ${currentSats.toLocaleString()} Sats`;
        });
      });

      satsInput.addEventListener("input", (e) => {
        const val = Number(e.target.value) || 0;
        currentSats = val;
        presets.forEach((b) => b.classList.remove("active"));
        submitBtn.querySelector("span:last-child").textContent = `Pay & NutZap ${currentSats.toLocaleString()} Sats`;
      });

      submitBtn.addEventListener("click", () => {
        const memo = card.querySelector(".np-nutzap-memo-input").value.trim();
        startPaymentFlow(currentSats, memo);
      });
    }

    // Step 2: Payment flow (Request quote -> Show QR -> Poll)
    async function startPaymentFlow(amountSats, memo) {
      if (amountSats <= 0) return;

      // Loading state
      card.innerHTML = `
        <div class="np-nutzap-header">
          <div class="np-nutzap-title"><span>⏳</span><span>Minting Invoice...</span></div>
          <button class="np-nutzap-close">&times;</button>
        </div>
        <div class="np-nutzap-body" style="text-align: center; padding: 40px 24px;">
          <div class="np-nutzap-spinner" style="width: 32px; height: 32px; margin: 0 auto 16px; border-width: 3px;"></div>
          <p style="color: #94a3b8; font-size: 14px;">Contacting Cashu Mint & generating Lightning invoice...</p>
        </div>
      `;
      card.querySelector(".np-nutzap-close").addEventListener("click", closeModal);

      try {
        const quoteRes = await fetch(`${HOST}/api/widget/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountSats, mintUrl }),
        });

        if (!quoteRes.ok) {
          throw new Error("Failed to get invoice from Cashu mint");
        }

        const quoteData = await quoteRes.json();
        const { quoteId, invoice, isMock } = quoteData;

        renderQrScreen(quoteId, invoice, amountSats, memo, isMock);
      } catch (err) {
        card.innerHTML = `
          <div class="np-nutzap-header">
            <div class="np-nutzap-title"><span>❌</span><span>Error</span></div>
            <button class="np-nutzap-close">&times;</button>
          </div>
          <div class="np-nutzap-body" style="text-align: center; padding: 24px;">
            <p style="color: #f87171; font-size: 14px; margin-bottom: 16px;">${escapeHtml(err.message || "Could not generate Lightning invoice")}</p>
            <button class="np-nutzap-submit np-nutzap-retry-btn">Try Again</button>
          </div>
        `;
        card.querySelector(".np-nutzap-close").addEventListener("click", closeModal);
        card.querySelector(".np-nutzap-retry-btn").addEventListener("click", renderInputForm);
      }
    }

    // Render Step 2 QR Screen
    function renderQrScreen(quoteId, invoice, amountSats, memo, isMock) {
      // Generate QR Code URL via pure reliable SVG image API
      const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&data=${encodeURIComponent(invoice)}`;

      const hasWebLn = typeof window !== "undefined" && Boolean(window.webln);

      card.innerHTML = `
        <div class="np-nutzap-header">
          <div class="np-nutzap-title"><span>⚡</span><span>Scan Lightning QR</span></div>
          <button class="np-nutzap-close">&times;</button>
        </div>
        <div class="np-nutzap-body">
          <div class="np-nutzap-qr-container">
            <div class="np-nutzap-qr-box">
              <img src="${qrImgUrl}" alt="Lightning Invoice QR" />
            </div>

            ${
              hasWebLn
                ? `<button class="np-nutzap-webln-btn">⚡ Pay with WebLN</button>`
                : ""
            }

            <div class="np-nutzap-actions">
              <a href="lightning:${invoice}" class="np-nutzap-action-btn">
                <span>📱</span><span>Open Wallet</span>
              </a>
              <button class="np-nutzap-action-btn np-nutzap-copy-btn">
                <span>📋</span><span>Copy Invoice</span>
              </button>
            </div>

            <div class="np-nutzap-polling">
              <div class="np-nutzap-spinner"></div>
              <span>Awaiting payment of <strong>${amountSats.toLocaleString()} Sats</strong>...</span>
            </div>
          </div>
        </div>
      `;

      card.querySelector(".np-nutzap-close").addEventListener("click", closeModal);

      // Copy Invoice Button
      const copyBtn = card.querySelector(".np-nutzap-copy-btn");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(invoice);
        copyBtn.innerHTML = `<span>✅</span><span>Copied!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<span>📋</span><span>Copy Invoice</span>`;
        }, 2000);
      });

      // WebLN Pay Button
      if (hasWebLn) {
        const weblnBtn = card.querySelector(".np-nutzap-webln-btn");
        weblnBtn.addEventListener("click", async () => {
          try {
            await window.webln.enable();
            await window.webln.sendPayment(invoice);
          } catch (weblnErr) {
            console.debug("WebLN error:", weblnErr);
          }
        });
      }

      // Start Polling for Settlement
      let elapsedTicks = 0;
      pollTimer = setInterval(async () => {
        elapsedTicks++;

        try {
          const claimRes = await fetch(`${HOST}/api/widget/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quoteId,
              mintUrl,
              amountSats,
              recipientPubkey: npub,
              comment: memo,
              isMock,
            }),
          });

          const result = await claimRes.json();
          if (result.success && result.status === "settled") {
            clearInterval(pollTimer);
            renderSuccessScreen(amountSats, name);
          }
        } catch (_) {}

        // Timeout polling after 90 seconds
        if (elapsedTicks > 45) {
          clearInterval(pollTimer);
        }
      }, 2000);
    }

    // Step 3: Success Screen
    function renderSuccessScreen(amountSats, authorName) {
      card.innerHTML = `
        <div class="np-nutzap-header">
          <div class="np-nutzap-title"><span>🎉</span><span>Delivered!</span></div>
          <button class="np-nutzap-close">&times;</button>
        </div>
        <div class="np-nutzap-body">
          <div class="np-nutzap-success">
            <div class="np-nutzap-success-icon">🥜⚡</div>
            <h4>NutZap Completed!</h4>
            <p>
              Successfully minted and sent <strong>${amountSats.toLocaleString()} Sats</strong> eCash straight to <strong>${escapeHtml(authorName)}</strong>.
            </p>
            <button class="np-nutzap-submit np-nutzap-done-btn">Done</button>
          </div>
        </div>
      `;

      card.querySelector(".np-nutzap-close").addEventListener("click", closeModal);
      card.querySelector(".np-nutzap-done-btn").addEventListener("click", closeModal);
    }

    // Start with Step 1
    renderInputForm();

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  // Escape HTML helper
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Create Standalone Button Element
  function createNutZapButton(config) {
    injectStyles();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "np-nutzap-btn";
    btn.setAttribute("aria-label", "NutZap Me with eCash");

    const labelText = config.label || "NutZap Me";
    btn.innerHTML = `
      <span style="font-size: 15px;">🥜</span>
      <span>${escapeHtml(labelText)}</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openNutZapModal(config);
    });

    return btn;
  }

  // Initialize auto-embedded scripts (<script src="...widget.js" data-npub="..."></script>)
  function initEmbeddedScripts() {
    const scripts = document.querySelectorAll('script[src*="widget.js"]:not([data-np-initialized])');

    scripts.forEach((script) => {
      script.setAttribute("data-np-initialized", "true");

      const npub = script.getAttribute("data-npub");
      if (!npub) return;

      const config = {
        npub,
        name: script.getAttribute("data-name") || "Creator",
        label: script.getAttribute("data-label") || "NutZap Me",
        amount: Number(script.getAttribute("data-amount")) || 100,
        mint: script.getAttribute("data-mint") || "https://testnut.cashu.space",
        theme: script.getAttribute("data-theme") || "dark",
      };

      const btn = createNutZapButton(config);
      if (script.parentNode) {
        script.parentNode.insertBefore(btn, script.nextSibling);
      }
    });
  }

  // Register Web Component <nutzap-me>
  if (typeof customElements !== "undefined" && !customElements.get("nutzap-me")) {
    class NutZapElement extends HTMLElement {
      connectedCallback() {
        if (this.hasAttribute("data-np-rendered")) return;
        this.setAttribute("data-np-rendered", "true");

        const config = {
          npub: this.getAttribute("npub") || this.getAttribute("data-npub") || "",
          name: this.getAttribute("name") || this.getAttribute("data-name") || "Creator",
          label: this.getAttribute("label") || this.getAttribute("data-label") || "NutZap Me",
          amount: Number(this.getAttribute("amount") || this.getAttribute("data-amount")) || 100,
          mint: this.getAttribute("mint") || this.getAttribute("data-mint") || "https://testnut.cashu.space",
          theme: this.getAttribute("theme") || this.getAttribute("data-theme") || "dark",
        };

        if (config.npub) {
          const btn = createNutZapButton(config);
          this.appendChild(btn);
        }
      }
    }

    customElements.define("nutzap-me", NutZapElement);
  }

  // Register alias Web Component <nutzap-widget>
  if (typeof customElements !== "undefined" && !customElements.get("nutzap-widget")) {
    class NutZapWidgetElement extends HTMLElement {
      connectedCallback() {
        if (this.hasAttribute("data-np-rendered")) return;
        this.setAttribute("data-np-rendered", "true");

        const config = {
          npub: this.getAttribute("npub") || this.getAttribute("data-npub") || "",
          name: this.getAttribute("name") || this.getAttribute("data-name") || "Creator",
          label: this.getAttribute("label") || this.getAttribute("data-label") || "NutZap Me",
          amount: Number(this.getAttribute("amount") || this.getAttribute("data-amount")) || 100,
          mint: this.getAttribute("mint") || this.getAttribute("data-mint") || "https://testnut.cashu.space",
          theme: this.getAttribute("theme") || this.getAttribute("data-theme") || "dark",
        };

        if (config.npub) {
          const btn = createNutZapButton(config);
          this.appendChild(btn);
        }
      }
    }

    customElements.define("nutzap-widget", NutZapWidgetElement);
  }

  // Global API exposure for programmatic usage
  window.NutZap = {
    open: openNutZapModal,
    createButton: createNutZapButton,
  };

  // Run on load and DOM readiness
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEmbeddedScripts);
  } else {
    initEmbeddedScripts();
  }
})();
