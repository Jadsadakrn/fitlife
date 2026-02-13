// auth.js — LocalStorage Auth + Session (Demo)
// ใช้สำหรับงานโปรเจกต์/เดโม่เท่านั้น (ไม่ปลอดภัยเท่า auth จริงบน server)
(function () {
  const KEY_USERS = "fit_users_v1";
  const KEY_SESSION = "fit_session_v1";
  const KEY_RESET = "fit_reset_v1";
  const SESSION_HOURS_DEFAULT = 8;

  const now = () => Date.now();
  const uid = () => "u_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
  const randCode = () => (Math.floor(100000 + Math.random() * 900000)).toString(); // 6-digit

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() {
    return readJSON(KEY_USERS, []);
  }
  function saveUsers(users) {
    writeJSON(KEY_USERS, users);
  }
  function findUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }
  function findUserById(userId) {
    const users = getUsers();
    return users.find(u => u.id === userId) || null;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function createSession(userId, hours = SESSION_HOURS_DEFAULT) {
    const session = {
      userId,
      token: uid(),
      createdAt: now(),
      expiresAt: now() + hours * 60 * 60 * 1000
    };
    writeJSON(KEY_SESSION, session);
    return session;
  }

  function getSession() {
    const s = readJSON(KEY_SESSION, null);
    if (!s || !s.userId || !s.expiresAt) return null;
    if (now() > s.expiresAt) {
      localStorage.removeItem(KEY_SESSION);
      return null;
    }
    return s;
  }

  function logout() {
    localStorage.removeItem(KEY_SESSION);
    // legacy demo flag (กันโค้ดเก่า)
    localStorage.removeItem("login");
  }

  function register({ name, email, password }) {
    name = String(name || "").trim();
    email = String(email || "").trim();
    password = String(password || "");

    if (name.length < 2) return { ok: false, message: "ชื่อสั้นไป (อย่างน้อย 2 ตัวอักษร)" };
    if (!validateEmail(email)) return { ok: false, message: "อีเมลไม่ถูกต้อง" };
    if (password.length < 4) return { ok: false, message: "รหัสผ่านสั้นไป (อย่างน้อย 4 ตัวอักษร)" };

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, message: "อีเมลนี้ถูกใช้แล้ว" };
    }

    const user = {
      id: uid(),
      name,
      email,
      password, // DEMO only
      verified: false,
      createdAt: now(),
      settings: { units: "metric", notifyWater: true, notifyWorkout: true },
      profile: { heightCm: "", weightKg: "", goal: "maintain", activity: "medium" }
    };
    users.push(user);
    saveUsers(users);

    // สร้าง "รหัสยืนยัน" แบบเดโม่ (โชว์บนหน้า)
    const verifyCode = randCode();
    writeJSON("fit_verify_v1", { email, code: verifyCode, createdAt: now(), expiresAt: now() + 15 * 60 * 1000 });

    return { ok: true, user, verifyCode };
  }

  function verifyEmail({ email, code }) {
    email = String(email || "").trim();
    code = String(code || "").trim();

    const v = readJSON("fit_verify_v1", null);
    if (!v || now() > v.expiresAt) return { ok: false, message: "โค้ดยืนยันหมดอายุแล้ว (ให้ขอโค้ดใหม่)" };
    if (v.email.toLowerCase() !== email.toLowerCase()) return { ok: false, message: "อีเมลไม่ตรงกับโค้ด" };
    if (v.code !== code) return { ok: false, message: "โค้ดไม่ถูกต้อง" };

    const users = getUsers();
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return { ok: false, message: "ไม่พบบัญชีนี้" };
    u.verified = true;
    saveUsers(users);
    localStorage.removeItem("fit_verify_v1");
    return { ok: true };
  }

  function login({ email, password, rememberHours }) {
    email = String(email || "").trim();
    password = String(password || "");

    const u = findUserByEmail(email);
    if (!u) return { ok: false, message: "ไม่พบบัญชีนี้" };
    if (u.password !== password) return { ok: false, message: "รหัสผ่านไม่ถูกต้อง" };

    const hours = Math.max(1, Number(rememberHours || SESSION_HOURS_DEFAULT));
    const session = createSession(u.id, hours);

    // legacy demo name for UI เดิม
    localStorage.setItem("fit_login_name", u.name);
    localStorage.setItem("login", "true");
    return { ok: true, session, user: sanitizeUser(u) };
  }

  function sanitizeUser(u) {
    if (!u) return null;
    const { password, ...rest } = u;
    return rest;
  }

  function requestPasswordReset(email) {
    email = String(email || "").trim();
    if (!validateEmail(email)) return { ok: false, message: "อีเมลไม่ถูกต้อง" };
    const u = findUserByEmail(email);
    if (!u) return { ok: false, message: "ไม่พบบัญชีนี้" };

    const code = randCode();
    writeJSON(KEY_RESET, {
      email,
      code,
      createdAt: now(),
      expiresAt: now() + 10 * 60 * 1000
    });
    return { ok: true, code }; // เดโม่: โชว์โค้ดบนหน้าแทนการส่งอีเมล
  }

  function resetPassword({ email, code, newPassword }) {
    email = String(email || "").trim();
    code = String(code || "").trim();
    newPassword = String(newPassword || "");
    if (newPassword.length < 4) return { ok: false, message: "รหัสผ่านสั้นไป (อย่างน้อย 4 ตัวอักษร)" };

    const r = readJSON(KEY_RESET, null);
    if (!r || now() > r.expiresAt) return { ok: false, message: "โค้ดรีเซ็ตหมดอายุแล้ว" };
    if (r.email.toLowerCase() !== email.toLowerCase()) return { ok: false, message: "อีเมลไม่ตรงกับโค้ด" };
    if (r.code !== code) return { ok: false, message: "โค้ดไม่ถูกต้อง" };

    const users = getUsers();
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return { ok: false, message: "ไม่พบบัญชีนี้" };

    u.password = newPassword;
    saveUsers(users);
    localStorage.removeItem(KEY_RESET);
    return { ok: true };
  }

  function changePassword({ userId, oldPassword, newPassword }) {
    oldPassword = String(oldPassword || "");
    newPassword = String(newPassword || "");
    if (newPassword.length < 4) return { ok: false, message: "รหัสผ่านใหม่สั้นไป (อย่างน้อย 4 ตัวอักษร)" };

    const users = getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return { ok: false, message: "ไม่พบบัญชีนี้" };
    if (u.password !== oldPassword) return { ok: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" };

    u.password = newPassword;
    saveUsers(users);
    return { ok: true };
  }

  function getCurrentUser() {
    const s = getSession();
    if (!s) return null;
    return sanitizeUser(findUserById(s.userId));
  }

  function requireAuth({ redirectTo = "login_new.html" } = {}) {
    const s = getSession();
    if (!s) {
      window.location.replace(redirectTo);
      return null;
    }
    return s;
  }

  function deleteAccount(userId) {
    const users = getUsers().filter(u => u.id !== userId);
    saveUsers(users);
    // ลบข้อมูลที่ผูกกับ user แบบง่าย ๆ
    Object.keys(localStorage).forEach(k => {
      if (k.includes(userId)) localStorage.removeItem(k);
    });
    logout();
    return { ok: true };
  }

  window.Auth = {
    // session
    getSession,
    getCurrentUser,
    requireAuth,
    logout,
    // account
    register,
    verifyEmail,
    login,
    requestPasswordReset,
    resetPassword,
    changePassword,
    deleteAccount,
    // low-level (optional)
    _getUsers: getUsers
  };
})();
