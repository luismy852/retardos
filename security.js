// --- LOGIN ---
let authUser = "";
let authPass = "";

// Login form handler
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userInput = document.getElementById("login-user").value;
    const passInput = document.getElementById("login-pass").value;
    authUser = userInput;
    authPass = passInput;
    localStorage.setItem("authUser", authUser);
    localStorage.setItem("authPass", authPass);
    window.location = "index.html";
  });
}
