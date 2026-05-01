// ============================================================
// UBG PRO — AUTHENTICATION SYSTEM
// Username-only auth using dummy email trick
// ============================================================

const DUMMY_DOMAIN = "@ubgpro.local";

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const authModal = document.getElementById("authModal");
  const closeAuthModal = document.getElementById("closeAuthModal");
  const authForm = document.getElementById("authForm");
  const authTitle = document.getElementById("authTitle");
  const authToggle = document.getElementById("authToggle");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const usernameInput = document.getElementById("authUsername");
  const passwordInput = document.getElementById("authPassword");

  const loginBtn = document.getElementById("loginBtn");
  const userProfileBtn = document.getElementById("userProfileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  let isSignUpMode = false;

  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      currentUser = user;
      const username = user.email.replace(DUMMY_DOMAIN, "");
      
      if (loginBtn) loginBtn.style.display = "none";
      if (userProfileBtn) {
        userProfileBtn.style.display = "flex";
        userProfileBtn.querySelector("span").textContent = username;
      }
      if (logoutBtn) logoutBtn.style.display = "flex";
      
      if (authModal) authModal.classList.remove("open");
    } else {
      // User is signed out
      currentUser = null;
      if (loginBtn) loginBtn.style.display = "flex";
      if (userProfileBtn) userProfileBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  });

  // Open Auth Modal
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      isSignUpMode = false;
      updateAuthUI();
      authModal.classList.add("open");
    });
  }

  // Close Auth Modal
  if (closeAuthModal) {
    closeAuthModal.addEventListener("click", () => {
      authModal.classList.remove("open");
    });
  }
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) authModal.classList.remove("open");
    });
  }

  // Toggle Sign Up / Login Mode
  if (authToggle) {
    authToggle.addEventListener("click", (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      updateAuthUI();
    });
  }

  function updateAuthUI() {
    if (isSignUpMode) {
      authTitle.textContent = "Create Account";
      authSubmitBtn.innerHTML = "Sign Up <i class='fas fa-user-plus'></i>";
      authToggle.innerHTML = "Already have an account? <span>Login</span>";
    } else {
      authTitle.textContent = "Welcome Back";
      authSubmitBtn.innerHTML = "Login <i class='fas fa-sign-in-alt'></i>";
      authToggle.innerHTML = "Need an account? <span>Sign Up</span>";
    }
  }

  // Submit Form
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      
      if (!username || !password) {
        showToast("Please fill in both fields");
        return;
      }
      
      const dummyEmail = username.toLowerCase() + DUMMY_DOMAIN;
      
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = "Please wait...";
      
      if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(dummyEmail, password)
          .then(() => {
            showToast("Account created successfully!");
          })
          .catch((error) => {
            handleAuthError(error);
          })
          .finally(() => resetAuthBtn());
      } else {
        auth.signInWithEmailAndPassword(dummyEmail, password)
          .then(() => {
            showToast("Logged in successfully!");
          })
          .catch((error) => {
            handleAuthError(error);
          })
          .finally(() => resetAuthBtn());
      }
    });
  }

  function resetAuthBtn() {
    authSubmitBtn.disabled = false;
    updateAuthUI();
  }

  function handleAuthError(error) {
    console.error("Auth error:", error);
    if (error.code === 'auth/email-already-in-use') {
      showToast("Username is already taken");
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      showToast("Invalid username or password");
    } else if (error.code === 'auth/weak-password') {
      showToast("Password should be at least 6 characters");
    } else {
      showToast("Authentication failed");
    }
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        showToast("Logged out successfully");
      });
    });
  }
});
