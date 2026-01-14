document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  const showLoginBtn = document.getElementById('show-login');
  const showSignupBtn = document.getElementById('show-signup');
  
  showLoginBtn.addEventListener('click', () => {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    showLoginBtn.classList.add('active');
    showSignupBtn.classList.remove('active');
  });
  
  showSignupBtn.addEventListener('click', () => {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    showLoginBtn.classList.remove('active');
    showSignupBtn.classList.add('active');
  });

  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  
  // --- Handle Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    // V V V V CHANGES HERE V V V V
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }) // Send email
    });
    // ^ ^ ^ ^ CHANGES HERE ^ ^ ^ ^
    
    const data = await res.json();
    
    if (data.success) {
      window.location.href = '/app';
    } else {
      loginError.textContent = data.message;
    }
  });

  // --- Handle Signup ---
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    
    // V V V V CHANGES HERE V V V V
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }) // Send email
    });
    // ^ ^ ^ ^ CHANGES HERE ^ ^ ^ ^
    
    const data = await res.json();
    
    if (data.success) {
      window.location.href = '/app';
    } else {
      signupError.textContent = data.message;
    }
  });
});document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const showLoginBtn = document.getElementById("show-login");
  const showSignupBtn = document.getElementById("show-signup");
  const switchToSignup = document.getElementById("switch-to-signup");
  const switchToLogin = document.getElementById("switch-to-login");

  const loginError = document.getElementById("login-error");
  const signupError = document.getElementById("signup-error");

  // Toggle Forms
  const showLogin = () => {
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
    showLoginBtn.classList.add("active");
    showSignupBtn.classList.remove("active");
    loginError.textContent = "";
    signupError.textContent = "";
  };

  const showSignup = () => {
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
    showSignupBtn.classList.add("active");
    showLoginBtn.classList.remove("active");
    loginError.textContent = "";
    signupError.textContent = "";
  };

  showLoginBtn.addEventListener("click", showLogin);
  showSignupBtn.addEventListener("click", showSignup);
  switchToSignup.addEventListener("click", showSignup);
  switchToLogin.addEventListener("click", showLogin);

  // --- Signup Form Submit ---
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.textContent = "";

    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();

    if (!name || !email || !password) {
      signupError.textContent = "All fields are required.";
      return;
    }
    if (!email.endsWith("@gmail.com")) {
      signupError.textContent = "Please enter a valid Gmail address.";
      return;
    }
    if (password.length < 6) {
      signupError.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/app";
      } else {
        signupError.textContent = data.message || "Signup failed.";
      }
    } catch (error) {
      signupError.textContent = "Server error. Please try again.";
    }
  });

  // --- Login Form Submit ---
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      loginError.textContent = "Please enter both Gmail and password.";
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/app";
      } else {
        loginError.textContent = data.message || "Login failed.";
      }
    } catch (error) {
      loginError.textContent = "Server error. Please try again.";
    }
  });
});
