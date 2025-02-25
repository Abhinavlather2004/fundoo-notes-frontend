document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".signup-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    let name = document.getElementById("name").value.trim();
    let mobile_number = document.getElementById("phone_number").value.trim();
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();
    let confirm_password = document.getElementById("confirm_password").value.trim();

    // Input validation
    if (!name || !mobile_number || !email || !password || !confirm_password) {
      alert("All fields are required.");
      return;
    }

    if (password !== confirm_password) {
      alert("Passwords do not match!");
      return;
    }

    let requestData = {
      user: {
        name: name,
        mobile_number: mobile_number,
        email: email,
        password: password
      }
    };
    

    try {
      let response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData),
        credentials: "include"
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Invalid server response", jsonError);
        alert("Server returned an unexpected response.");
        return;
      }

      if (response.ok) {
        alert("Registration successful!");
        window.location.href = "../pages/fundooLogin.html";
      } else {
        let errorMessage = "Registration failed. Please try again.";

        if (result && typeof result === "object") {
          if (Array.isArray(result.errors)) {
            errorMessage = result.errors.join(", ");
          } else if (result.error) {
            errorMessage = result.error;
          }
        }

        alert("Error: " + errorMessage);
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("Network error, please check your internet connection.");
    }
  });
});
