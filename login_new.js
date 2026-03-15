(function () {
  const API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://fitlife-web.onrender.com";

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const toast = $("toast");
  function showToast(message, sub = "") {
    if (!toast) return;
    toast.innerHTML = sub ? `${message}<div class="t-muted">${sub}</div>` : message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function redirectToApp() { window.location.replace("index.html"); }

  function setPane(pane) {
    const panes = ["login", "register", "forgot", "reset"];
    panes.forEach((p) => {
      const form = document.querySelector(`.auth-form[data-pane="${p}"]`);
      if (form) form.classList.toggle("hidden", p !== pane);
    });

    const tabs = $("authTabs");
    if (tabs) tabs.style.display = (pane === "forgot" || pane === "reset") ? "none" : "flex";

    $$(".auth-tabs .tab").forEach((b) => {
      const isActive = b.dataset.tab === pane;
      b.classList.toggle("active", isActive);
      b.style.background = isActive ? "white" : "transparent";
      b.style.color = isActive ? "#111827" : "#6b7280";
    });

    const titleEl = $("authTitle");
    const subEl = $("authSub");
    if (pane === "login") { titleEl.textContent = "เข้าสู่ระบบ"; subEl.textContent = "เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน"; }
    else if (pane === "forgot") { titleEl.textContent = "ลืมรหัสผ่าน"; subEl.textContent = "กรอกอีเมลเพื่อยืนยันตัวตน"; }
    else if (pane === "reset") { titleEl.textContent = "ตั้งรหัสผ่านใหม่"; subEl.textContent = "กำหนดรหัสผ่านใหม่เพื่อเข้าใช้งาน"; }
    else if (pane === "register") { titleEl.textContent = "สมัครสมาชิก"; subEl.textContent = "เริ่มต้นการเดินทางเพื่อสุขภาพของคุณ"; }
  }

  $$(".auth-tabs .tab").forEach((btn) => btn.addEventListener("click", () => setPane(btn.dataset.tab)));
  if ($("goForgot")) $("goForgot").addEventListener("click", (e) => { e.preventDefault(); setPane("forgot"); });
  ["backToLogin1", "backToLogin2"].forEach((id) => {
    if ($(id)) $(id).addEventListener("click", () => setPane("login"));
  });
  if ($("pwToggle") && $("loginPassword")) {
    $("pwToggle").addEventListener("click", () => {
      const isPw = $("loginPassword").type === "password";
      $("loginPassword").type = isPw ? "text" : "password";
      $("pwToggle").querySelector("i").className = isPw ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    });
  }

  // LOGIN
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value.trim();
    if (!email || !password) return showToast("กรุณากรอกข้อมูลให้ครบ");
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return showToast("เข้าสู่ระบบไม่สำเร็จ", data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      showToast("สำเร็จ 🎉", "กำลังไปหน้าหลัก...");
      setTimeout(redirectToApp, 1000);
    } catch (err) { showToast("ติดต่อ Server ไม่ได้", "กรุณาตรวจสอบการเชื่อมต่อ"); }
  });

  // REGISTER
  $("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value.trim();
    const password2 = $("regPassword2").value.trim();
    if (!email || !password) return showToast("กรุณากรอกข้อมูลให้ครบ");
    if (password.length < 6) return showToast("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (password !== password2) return showToast("รหัสผ่านไม่ตรงกัน");
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return showToast("สมัครไม่สำเร็จ", data.error || "");
      showToast("สมัครสมาชิกสำเร็จ 🎉", "กรุณาเข้าสู่ระบบ");
      setTimeout(() => setPane("login"), 1500);
    } catch (err) { showToast("ติดต่อ Server ไม่ได้"); }
  });

  // FORGOT
  $("forgotForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("forgotEmail").value.trim();
    if (!email) return showToast("กรุณากรอกอีเมล");
    showToast("ยืนยันอีเมลสำเร็จ", "กรุณาตั้งรหัสผ่านใหม่");
    setPane("reset");
  });

  // RESET PASSWORD
  $("resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("forgotEmail").value.trim();
    const newPassword = $("newPassword").value.trim();
    if (!email) return showToast("ไม่พบข้อมูลอีเมล", "กรุณากลับไปกรอกอีเมลที่หน้าลืมรหัสผ่านใหม่");
    if (newPassword.length < 6) return showToast("รหัสผ่านสั้นเกินไป", "ต้องมีอย่างน้อย 6 ตัวอักษร");
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword })
      });
      const data = await res.json();
      if (res.ok) { showToast("สำเร็จ ✅", "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว"); setTimeout(() => setPane("login"), 1500); }
      else showToast("ผิดพลาด", data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
    } catch (err) { showToast("Server error", "การเชื่อมต่อล้มเหลว"); }
  });

  setPane("login"); // 🔥 เรียกครั้งเดียวตอนท้าย
})();