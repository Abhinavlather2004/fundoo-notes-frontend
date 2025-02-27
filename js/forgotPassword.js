document.addEventListener("DOMContentLoaded", function () {
  const forgotForm = document.getElementById("forgot-password-form");

  forgotForm.addEventListener("submit", async function (event) {
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
        localStorage.setItem("resetUserId", data.user_id); // Store user ID
        window.location.href = "resetPassword.html"; // Redirect to reset password page
      } else {
        alert("Error: " + (data.error || "Failed to send OTP"));
      }
    } catch (error) {
      alert("Something went wrong. Please try again.");
    }
  });
});
