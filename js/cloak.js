// ============================================================
// UBG PRO — STEALTH TAB SYSTEM
// ============================================================

const CLOAK_KEY = "ubgpro_cloak";
const PANIC_SETTINGS_KEY = "ubgpro_panic";

function applyCloak(title, iconUrl) {
  document.title = title;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = iconUrl;
  localStorage.setItem(CLOAK_KEY, JSON.stringify({ title, iconUrl }));
  showToast(`🎭 Stealth Mode: ${title}`);
}

function removeCloak() {
  document.title = "UBG Pro";
  let link = document.querySelector("link[rel~='icon']");
  if (link) link.href = "assets/favicon.ico";
  localStorage.removeItem(CLOAK_KEY);
  showToast("✅ Stealth mode removed");
}

function loadSavedCloak() {
  const saved = localStorage.getItem(CLOAK_KEY);
  if (saved) {
    try {
      const { title, iconUrl } = JSON.parse(saved);
      document.title = title;
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = iconUrl;
    } catch(e) {}
  }
}

function openAboutBlank() {
  const w = window.open("about:blank", "_blank");
  if (!w) { showToast("⚠️ Allow popups to use this feature"); return; }
  const doc = w.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>Loading...</title></head><body style="margin:0;background:#fff;">
  <iframe src="${location.href}" style="width:100%;height:100vh;border:none;"></iframe>
  </body></html>`);
  doc.close();
  showToast("👻 Opened in stealth tab");
}

// Panic key system
function getPanicSettings() {
  const saved = localStorage.getItem(PANIC_SETTINGS_KEY);
  return saved ? JSON.parse(saved) : { key: 'x', url: 'https://classroom.google.com' };
}

function savePanicSettings(key, url) {
  if (!key || !url) return;
  localStorage.setItem(PANIC_SETTINGS_KEY, JSON.stringify({ key: key.toLowerCase(), url }));
  showToast("🚨 Panic settings saved!");
}

function setupPanicKey() {
  document.addEventListener("keydown", (e) => {
    const settings = getPanicSettings();
    if (e.altKey && e.key.toLowerCase() === settings.key) {
      window.location.href = settings.url;
    }
  });
}

// Init system
document.addEventListener("DOMContentLoaded", () => {
  loadSavedCloak();
  setupPanicKey();

  // Load panic settings into UI
  const settings = getPanicSettings();
  const panicKeyInput = document.getElementById("panicKeyInput");
  const panicUrlInput = document.getElementById("panicUrlInput");
  if (panicKeyInput) panicKeyInput.value = settings.key;
  if (panicUrlInput) panicUrlInput.value = settings.url;

  // Preset buttons
  document.querySelectorAll(".cloak-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const title = btn.dataset.title;
      const icon = btn.dataset.icon;
      applyCloak(title, icon);
    });
  });

  // Custom cloak
  const applyBtn = document.getElementById("applyCloakBtn");
  const removeBtn = document.getElementById("removeCloakBtn");
  const blankBtn = document.getElementById("blankCloakBtn");
  const savePanicBtn = document.getElementById("savePanicBtn");
  const headerPanicBtn = document.getElementById("panicBtn");
  const headerCloakBtn = document.getElementById("cloakBtn");

  if (applyBtn) applyBtn.addEventListener("click", () => {
    const title = document.getElementById("cloakTitle").value || "Google Docs";
    const icon = document.getElementById("cloakIcon").value || "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico";
    applyCloak(title, icon);
  });

  if (removeBtn) removeBtn.addEventListener("click", removeCloak);
  if (blankBtn) blankBtn.addEventListener("click", openAboutBlank);

  if (savePanicBtn) {
    savePanicBtn.addEventListener("click", () => {
      const key = document.getElementById("panicKeyInput").value;
      const url = document.getElementById("panicUrlInput").value;
      savePanicSettings(key, url);
    });
  }

  // Header panic btn
  if (headerPanicBtn) headerPanicBtn.addEventListener("click", () => {
    const settings = getPanicSettings();
    window.location.href = settings.url;
  });

  // Header quick cloak btn
  if (headerCloakBtn) headerCloakBtn.addEventListener("click", () => {
    applyCloak("Google Docs - Untitled Document", "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico");
  });
});
