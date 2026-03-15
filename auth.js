// auth.js — LocalStorage Auth + Session (Demo)
// ใช้สำหรับงานโปรเจกต์/เดโม่เท่านั้น (ไม่ปลอดภัยเท่า auth จริงบน server)
// auth.js — ระบบจัดการ Session สำหรับเชื่อมต่อกับ Backend จริง
(function () {
  
  // ตรวจสอบว่ามี Token หรือไม่ (ใช้เช็คว่าล็อกอินค้างไว้ไหม)
  function getSession() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return { token };
  }

  // ดึงข้อมูลผู้ใช้ที่เก็บไว้ตอนล็อกอิน
  function getCurrentUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  // ฟังก์ชันสำหรับหน้า Dashboard: ถ้าไม่ได้ล็อกอิน ให้เด้งไปหน้า Login
  function requireAuth() {
    if (!getSession()) {
      window.location.replace("login_new.html");
      return null;
    }
    return getSession();
  }

  // ออกจากระบบ
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // ลบค่า legacy อื่นๆ (ถ้ามี)
    localStorage.removeItem("login"); 
    window.location.replace("login_new.html");
  }

  // ส่งออกฟังก์ชันไปที่ window เพื่อให้ไฟล์อื่นเรียกใช้ได้
  window.Auth = {
    getSession,
    getCurrentUser,
    requireAuth,
    logout
  };
})();