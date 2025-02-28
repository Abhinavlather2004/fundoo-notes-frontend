document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("fundoo-login-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const resetPasswordForm = document.getElementById("reset-password-form");

  // Handle login submission
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

  // Handle Forgot Password submission
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const email = document.getElementById("forgot-email").value.trim();

      if (!email) {
        alert("Please enter your email.");
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/api/v1/users/forgot_password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { email } }),
        });

        const data = await response.json();

        if (response.ok) {
          alert("OTP sent to your email.");
          localStorage.setItem("resetUserId", data.user_id);
          new bootstrap.Modal(document.getElementById("forgotPasswordModal")).hide();
          new bootstrap.Modal(document.getElementById("resetPasswordModal")).show();
        } else {
          alert("Error: " + (data.error || "Failed to send OTP"));
        }
      } catch (error) {
        alert("Something went wrong. Please try again.");
      }
    });
  }

  // Handle Reset Password submission
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const userId = localStorage.getItem("resetUserId");
      const otp = document.getElementById("otp").value.trim();
      const newPassword = document.getElementById("new-password").value.trim();

      if (!otp || !newPassword) {
        alert("Please enter OTP and new password.");
        return;
      }

      try {
        const response = await fetch(`http://localhost:3000/api/v1/users/reset_password/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { otp, new_password: newPassword } }),
        });

        const data = await response.json();

        if (response.ok) {
          alert("Password reset successfully. Please log in.");

          // Hide Reset Password Modal
          const resetPasswordModal = bootstrap.Modal.getInstance(document.getElementById("resetPasswordModal"));
          if (resetPasswordModal) resetPasswordModal.hide();

          // Clear stored resetUserId
          localStorage.removeItem("resetUserId");

          // Refresh the page to show login form again
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          alert("Error: " + (data.errors || "Failed to reset password"));
        }
      } catch (error) {
        alert("Something went wrong. Please try again.");
      }
    });
  }
});
