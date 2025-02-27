document.addEventListener("DOMContentLoaded", function () {
  const resetForm = document.getElementById("reset-password-form");

  resetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const otp = document.getElementById("otp").value.trim();
    const newPassword = document.getElementById("new-password").value.trim();
    const userId = localStorage.getItem("resetUserId"); // Retrieve stored user ID

    if (!otp || !newPassword) {
      alert("Missing required fields.");
      return;
    }

    if (!userId) {
      alert("Session expired. Please request OTP again.");
      window.location.href = "forgotPassword.html"; // Redirect to OTP request page
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/v1/users/reset_password/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({user:{otp, new_password: newPassword}  }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Password reset successful. Please login.");
        localStorage.removeItem("resetUserId"); // Clear stored user ID
        window.location.href = "fundooLogin.html"; // Redirect to login page
      } else {
        alert("Error: " + (data.error || "Failed to reset password"));
      }
    } catch (error) {
      alert("Something went wrong. Please try again.");
    }
  });
});
