document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("fundoo-login-form");
  const forgotPasswordLink = document.querySelector(".fundoo-login-forgot-password");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("floatingInput").value.trim();
      const password = document.getElementById("floatingPassword").value.trim();

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/api/v1/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { email, password } }),
        });

        const data = await response.json();

        if (response.ok && data.token) {
          localStorage.setItem("jwtToken", data.token);
          window.location.href = "../pages/fundooDashboard.html";
        } else {
          alert("Login failed: " + (data.error || "Invalid credentials"));
        }
      } catch (error) {
        alert("Something went wrong. Please try again.");
      }
    });
  }

  // ✅ Fix: Redirect to forgot password page instead of showing a prompt
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "../pages/forgotPassword.html"; // Redirect to Forgot Password page
    });
  }
});
