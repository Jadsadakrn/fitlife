// FitLife Easy — Auth UI Logic (localStorage demo)
(function () {
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

  function redirectToApp() {
    window.location.replace("index.html");
  }

  // ถ้า login แล้ว ไม่ต้องเห็นหน้า login
  //if (window.Auth && Auth.getSession()) {
    //redirectToApp();
    //return;
  

  // Tabs / panes
  const titleEl = $("authTitle");
  const subEl = $("authSub");

  function setPane(pane) {
    const panes = ["login", "register", "forgot", "reset", "verify"];
    panes.forEach((p) => {
      const form = document.querySelector(`.auth-form[data-pane="${p}"]`);
      if (form) form.classList.toggle("hidden", p !== pane);
    });
    $$(".auth-tabs .tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === pane));

    if (pane === "login") {
      titleEl.textContent = "เข้าสู่ระบบ";
      subEl.textContent = "เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน";
    } else if (pane === "register") {
      titleEl.textContent = "สมัครสมาชิก";
      subEl.textContent = "สร้างบัญชีใหม่ (เดโม่: มีโค้ดยืนยันแสดงบนหน้า)";
    } else if (pane === "forgot") {
      titleEl.textContent = "ลืมรหัสผ่าน";
      subEl.textContent = "ขอโค้ดรีเซ็ต (เดโม่: โค้ดจะแสดงบนหน้าจอ)";
    } else if (pane === "reset") {
      titleEl.textContent = "รีเซ็ตรหัสผ่าน";
      subEl.textContent = "ใส่อีเมล + โค้ด 6 หลัก + รหัสผ่านใหม่";
    } else if (pane === "verify") {
      titleEl.textContent = "ยืนยันอีเมล";
      subEl.textContent = "ใส่อีเมลและโค้ด 6 หลัก";
    }
  }

  // tab buttons
  $$(".auth-tabs .tab").forEach((btn) => {
    btn.addEventListener("click", () => setPane(btn.dataset.tab));
  });

  // quick nav buttons
  const goForgot = $("goForgot");
  if (goForgot) goForgot.addEventListener("click", () => setPane("forgot"));
  const goReset = $("goReset");
  if (goReset) goReset.addEventListener("click", () => setPane("reset"));
  ["backToLogin1", "backToLogin2", "backToLogin3"].forEach((id) => {
    const b = $(id);
    if (b) b.addEventListener("click", () => setPane("login"));
  });

  // toggle password (login)
  const pwToggle = $("pwToggle");
  const loginPass = $("loginPassword");
  if (pwToggle && loginPass) {
    pwToggle.addEventListener("click", () => {
      const isPw = loginPass.type === "password";
      loginPass.type = isPw ? "text" : "password";
      pwToggle.querySelector("i").className = isPw ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    });
  }

  // Clear demo data
  const clearBtn = $("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const ok = confirm("ล้างข้อมูลเดโม่ทั้งหมดในเครื่องนี้? (บัญชี/โปรไฟล์/อาหาร/ประวัติออกกำลังกาย)");
      if (!ok) return;
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("fit_")) localStorage.removeItem(k);
        if (k === "login") localStorage.removeItem(k);
      });
      showToast("ล้างข้อมูลเรียบร้อย ✅", "ตอนนี้เริ่มใหม่ได้เลย");
    });
  }

  // LOGIN
  const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = ($("loginEmail").value || "").trim();
    const password = ($("loginPassword").value || "").trim();

    if (!email) return showToast("กรุณาใส่อีเมล");
    if (password.length < 4) return showToast("รหัสผ่านสั้นไป");

    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return showToast("เข้าไม่ได้", data.error);
      }

      // เก็บ JWT
      localStorage.setItem("token", data.token);

      showToast("เข้าสู่ระบบสำเร็จ 🎉");
      setTimeout(redirectToApp, 500);

    } catch (err) {
      console.error(err);
      showToast("Server error");
    }
  });
}
  // REGISTER (API version)
const regForm = $("registerForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = ($("regEmail").value || "").trim();
    const password = ($("regPassword").value || "").trim();
    const confirm = ($("regPassword2").value || "").trim();

    if (password !== confirm) {
      return showToast("รหัสผ่านไม่ตรงกัน");
    }

    try {
      const response = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return showToast("สมัครไม่ได้", data.error);
      }

      showToast("สมัครสำเร็จ ✅", "เข้าสู่ระบบได้เลย");
      setPane("login");

    } catch (err) {
      console.error(err);
      showToast("Server error");
    }
  });
}

  // VERIFY
  const verifyForm = $("verifyForm");
  if (verifyForm) {
    verifyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = ($("verifyEmail").value || "").trim();
      const code = ($("verifyCode").value || "").trim();
      const res = Auth.verifyEmail({ email, code });
      if (!res.ok) return showToast("ยืนยันไม่ได้", res.message);

      showToast("ยืนยันสำเร็จ ✅", "กลับไป Login ได้เลย");
      setPane("login");
    });
  }

  // FORGOT
  const forgotForm = $("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = ($("forgotEmail").value || "").trim();
      const res = Auth.requestPasswordReset(email);
      if (!res.ok) return showToast("ทำไม่ได้", res.message);

      const hint = $("resetHint");
      if (hint) hint.textContent = `โค้ดรีเซ็ต (เดโม่) คือ: ${res.code}  (หมดอายุ ~10 นาที)`;
      $("resetEmail").value = email;
      showToast("ส่งโค้ดแล้ว ✅", "กด “มีโค้ดแล้ว รีเซ็ตเลย”");
    });
  }

  // RESET
  const resetForm = $("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = ($("resetEmail").value || "").trim();
      const code = ($("resetCode").value || "").trim();
      const newPassword = ($("resetPassword").value || "").trim();
      const res = Auth.resetPassword({ email, code, newPassword });
      if (!res.ok) return showToast("รีเซ็ตไม่ได้", res.message);

      showToast("เปลี่ยนรหัสผ่านแล้ว ✅", "กลับไป Login");
      setPane("login");
    });
  }

  // default
  setPane("login");
})();
