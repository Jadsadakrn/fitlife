// @ts-nocheck
/* =========================================
   const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    เว็บdeploy
    : "https://fitlife-dlfz.onrender.com";
   ========================================= */
let isSavingMeal = false; // 🔥 ตัวแปรล็อกสถานะการบันทึกอาหาร

// ===== Auth/User scope =====
const __session = (window.Auth && Auth.getSession) ? Auth.getSession() : null;
const __user = (window.Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
const __userId = (__user && __user.id) ? __user.id : "guest";
const ukey = (k) => `${k}_${__userId}`;
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://fitlife-web.onrender.com";



let currentStep = 1;
const totalSteps = 4;

let waterIntake = 750;
const waterGoal = 2000;

// ============================
// Global Data Store
// ============================

let workoutData = [];
let foodLibrary = [];
let programSchedule = [];
window.todayWorkout = [];
let completedWorkouts = [];

function getDailyLog() {
  return JSON.parse(localStorage.getItem("fit_daily")) || {};

}

function saveDailyLog(log) {
  localStorage.setItem("fit_daily", JSON.stringify(log));
}

// ถ้า session หมดอายุ ให้เด้งกลับไปหน้า Login
if (window.Auth && !__session) {
  window.location.replace("login_new.html");
}

/* =========================================
   1. WORKOUT 
   ========================================= */

function getDifficultyClass(text) {
  if (text.toLowerCase().includes("easy")) return "beginner";
  if (text.toLowerCase().includes("medium")) return "intermediate";
  if (text.toLowerCase().includes("hard")) return "advanced";
  return "beginner";
}

function renderFoodLibrary() {
  const el = document.getElementById("food-library-list");
  if (!el) return;

  el.innerHTML = `
    <div class="food-grid">
      ${foodLibrary.map((x, index) => {
    // 1. ถ้าเป็นหัวข้อหมวดหมู่
    if (!x.kcal || x.kcal === 0) {
      return `<div class="food-category-header" style="grid-column: 1/-1; background: #f8fafc; padding: 12px; border-radius: 12px; margin: 15px 0 5px; font-weight: 600; color: #64748b; text-align: center; border: 1px dashed #cbd5e1;">--- ${x.name} ---</div>`;
    }

    // 2. ถ้าเป็นอาหารปกติ (ใช้ onclick เรียกฟังก์ชันที่ผมสร้างให้ใหม่ข้างล่าง)
    return `
          <div class="food-card" onclick="window.handleFoodClick(${index})" style="cursor: pointer;">
            <img src="${x.img || ''}" alt="${x.name}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
            <div class="food-card-body">
              <h3>${x.name}</h3>
              <p style="color: #10b981; font-weight: bold;">${x.kcal} kcal</p>
              <small>P:${x.protein} • C:${x.carbs} • F:${x.fat}</small>
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

function hydrateArenaImages() {
  const arena = document.getElementById('exercise');
  if (!arena) return;   // 🔥 กัน error

  if (!window.workoutData || !Array.isArray(window.workoutData)) return;

  const map = new Map(
    window.workoutData.map(w => [
      w.title.trim().toLowerCase(),
      w.img
    ])
  );

  arena.querySelectorAll('.workout-card').forEach(card => {
    const titleEl = card.querySelector('h3');
    const imgEl = card.querySelector('img');
    if (!titleEl || !imgEl) return;

    const title = titleEl.innerText.trim().toLowerCase();
    const current = imgEl.getAttribute('src') || '';
    if (current.trim()) return;

    const url = map.get(title);
    if (url) imgEl.setAttribute('src', url);
  });
}


// render each meal list
const renderMeal = (mealType, containerId, sumId) => {
  const el = document.getElementById(containerId);
  const sumEl = document.getElementById(sumId);
  if (!el) return;

  // ดึงข้อมูลรายการอาหารของมื้อนั้นๆ (เช่น breakfast, lunch, dinner)
  const list = day[mealType] || [];
  const t = calcMealTotals(list);
  if (sumEl) sumEl.innerText = `${t.cal} kcal`;

  // --- ✅ ส่วนที่เพิ่มเข้ามา: สร้าง HTML การ์ดอาหาร ---
  if (list.length === 0) {
    el.innerHTML = `<p style="color:#9CA3AF; font-size:0.9rem; padding:10px;">ยังไม่มีรายการอาหารมื้อนี้</p>`;
    return;
  }

  el.innerHTML = list.map((item, index) => `
    <div class="meal-card" data-meal="${mealType}" data-idx="${index}">
      <img src="${item.image || 'https://via.placeholder.com/80?text=Food'}" class="meal-img" alt="${item.name}">
      <div class="meal-info">
        <div class="meal-name">${item.name}</div>
        <div class="meal-meta">
          ${item.cal} kcal | P: ${item.p}g C: ${item.c}g F: ${item.f}g
        </div>
      </div>
      <button class="food-delete" style="background:none; border:none; color:#EF4444; cursor:pointer; padding:5px;">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `).join('');

  // --- ส่วนจัดการ Events (คลิก/ลบ) ---
  el.querySelectorAll(".meal-card").forEach(row => {
    const del = row.querySelector(".food-delete");
    const m = row.dataset.meal;
    const idx = Number(row.dataset.idx);

    row.addEventListener("click", (e) => {
      if (e.target.closest('.food-delete')) return; // ถ้ากดปุ่มลบ ไม่ต้องเปิด detail
      openFoodDetail(m, idx);
    });

    if (del) {
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFoodItem(m, idx);
      });
    }
  });
};

renderMeal("breakfast", "food-breakfast-list", "sum-breakfast");
renderMeal("lunch", "food-lunch-list", "sum-lunch");
renderMeal("dinner", "food-dinner-list", "sum-dinner");


/* 
  const log = getFoodLog();
  const today = getTodayKey();
  const item = log?.[today]?.[meal]?.[idx];
  if (!item) return;

  __foodDetailCtx = { meal, idx };

  const modal = document.getElementById("food-detail-modal");
  if (!modal) return;

  setText("food-detail-title", item.name);
  setText("food-detail-sub", `${FOOD_MEAL_LABEL[meal]} • ${item.cal} kcal`);
  setText("fd-cal", String(item.cal));
  setText("fd-p", `${item.p} g`);
  setText("fd-c", `${item.c} g`);
  setText("fd-f", `${item.f} g`);

  modal.style.display = "flex";
} */







const workoutDB = {
  "Squat": { instruction: "ยืนกางขาเท่าไหล่ ย่อตัวเหมือนนั่งเก้าอี้ ทิ้งน้ำหนักลงส้นเท้า", sets: 3, repsGuide: "10-15", defaultReps: 12 },
  "Push-up": { instruction: "วางมือทำมุมกว้างกว่าไหล่เล็กน้อย ลำตัวเหยียดตรง ย่อตัวลง", sets: 3, repsGuide: "8-12", defaultReps: 10 },
  "Plank": { instruction: "นอนคว่ำ วางศอกลงพื้น เกร็งหน้าท้องและก้น ลำตัวเป็นเส้นตรง", sets: 3, repsGuide: "30-45 วิ", defaultReps: 30 },
  "Jumping Jack": { instruction: "กระโดดตบแยกขาพร้อมวาดแขนขึ้น แล้วกระโดดกลับท่าเดิม", sets: 3, repsGuide: "30-50", defaultReps: 40 },
  "Lunges": { instruction: "ก้าวขาไปข้างหน้า ย่อตัวลงจนเข่าตั้งฉาก สลับข้าง", sets: 3, repsGuide: "10-12/ข้าง", defaultReps: 10 },
  "High Knees": { instruction: "วิ่งอยู่กับที่ ยกเข่าสูงระดับเอว", sets: 3, repsGuide: "40-60", defaultReps: 50 },
  "Crunches": { instruction: "นอนหงาย ชันเข่า ยกไหล่ขึ้นจากพื้นด้วยหน้าท้อง", sets: 3, repsGuide: "12-20", defaultReps: 15 },
  "Burpees": { instruction: "ย่อวางมือ -> ดีดขาหลัง -> ดึงกลับ -> กระโดด", sets: 3, repsGuide: "6-12", defaultReps: 8 },
  "Mountain Climber": { instruction: "ตั้งท่าวิดพื้น ดึงเข่าสลับเข้าหาหน้าอกอย่างรวดเร็ว", sets: 3, repsGuide: "30-50", defaultReps: 40 },
  "Leg Raise": { instruction: "นอนหงาย ยกขาขึ้นตรงๆ โดยไม่งอเข่า คุมหน้าท้อง", sets: 3, repsGuide: "10-15", defaultReps: 12 },
  "Tricep Dips": { instruction: "ใช้เก้าอี้ วางมือด้านหลัง งอศอกย่อตัวขึ้นลง", sets: 3, repsGuide: "10-15", defaultReps: 12 },
  "Russian Twist": { instruction: "นั่งเอนตัวเล็กน้อย บิดลำตัวซ้ายขวา เกร็งหน้าท้อง", sets: 3, repsGuide: "16-30", defaultReps: 20 },
  "Walk": { instruction: "เดินเร็วๆ เหยียดแขน ระวังท่าทาง", sets: 1, repsGuide: "30 นาที", defaultReps: 30 },
  "Row": { instruction: "ยืนดึงขอบประตูหรือแถบยืด ดึงศอกหลัง", sets: 3, repsGuide: "12-15", defaultReps: 12 },
  "Knee Push-up": { instruction: "วิดพื้นแบบงอเข่าลงพื้น เน้นแขนและหน้าอก", sets: 3, repsGuide: "10-15", defaultReps: 12 },
  "Warm Up": { instruction: "เดินเร็ว กระโดดตบ ยืดเหยียดร่างกาย", sets: 1, repsGuide: "10 นาที", defaultReps: 10 },
  "Full Body Circuit": { instruction: "Squat + Push-up + Plank ทำต่อเนื่อง", sets: 3, repsGuide: "12-15", defaultReps: 12 }
};

/* =========================================
   2. HELPER FUNCTIONS
   ========================================= */
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;

  let startTimestamp = null;

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;

    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentVal = Math.floor(progress * (end - start) + start);

    obj.textContent = currentVal.toLocaleString();

    if (progress < 1) window.requestAnimationFrame(step);
  };

  window.requestAnimationFrame(step);
}

function calculateCalories(profile) {
  const { age, gender, weight, height, goal, level } = profile;

  // 1. BMR (Mifflin-St Jeor)
  let bmr;
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // 2. Activity multiplier
  const activityMap = {
    easy: 1.375,
    medium: 1.55,
    hard: 1.725
  };

  const tdee = bmr * (activityMap[level] || 1.55);

  // 3. ปรับตามเป้าหมาย
  let finalCal = tdee;
  if (goal === "lose") finalCal -= 300;
  if (goal === "gain") finalCal += 300;

  // 4. Macro
  const protein = weight * 2; // 2g/kg
  const fat = weight * 0.8;   // 0.8g/kg
  const carbs = (finalCal - (protein * 4 + fat * 9)) / 4;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(finalCal),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs)
  };
}


function updateCircleGraph(current, target) {
  const circle = document.getElementById("dash-cal-circle");
  if (!circle) return;

  let percent = Math.min((current / target) * 100, 100);

  setTimeout(() => {
    circle.style.background = `conic-gradient(#4facfe 0% ${percent}%, #f0f2f5 ${percent}% 100%)`;
    circle.style.transition = "background 1.5s ease-out";
  }, 100);
}

function updateMacroBar(elementId, current, goal) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let percent = Math.min((current / goal) * 100, 100);
  el.style.width = percent + "%";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function renderList(containerId, items, storageKey, onPick) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const selected = localStorage.getItem(storageKey) || "";

  el.innerHTML = items.map(x => `
    <div class="list-item ${selected === x.id ? "selected" : ""}" data-id="${x.id}">
      <div class="li-left">
        <div class="li-icon">${x.img ? `<img src="${x.img}" alt="${x.title}">` : ""}</div>
        <div class="li-text">
          <div class="li-title">${x.title}</div>
          <div class="li-sub">${x.sub}</div>
        </div>
      </div>
    </div>
  `).join("");

  el.querySelectorAll(".list-item").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.dataset.id;
      localStorage.setItem(storageKey, id);

      el.querySelectorAll(".list-item").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");

      const item = items.find(i => i.id === id);
      if (onPick && item) onPick(item);
    });
  });
}

function renderWorkoutCards(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = items.map(item => {
    // ✅ เช็คสถานะ: ท่านี้ทำไปหรือยัง
    const isDone = completedWorkouts.includes(item.id);

    return `
      <div class="workout-card ${isDone ? "done" : ""}" data-id="${item.id}" 
           style="${isDone ? 'pointer-events: none; opacity: 0.8;' : 'cursor: pointer;'}">
        <div class="workout-img">
          <img src="${item.img}" alt="${item.title}">
          <span class="difficulty-badge beginner">${item.sub}</span>
          ${isDone ? `<div class="saved-badge" style="background:#10B981; position:absolute; top:10px; right:10px; color:white; width:25px; height:25px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;">✔</div>` : ""}
        </div>
        <div class="workout-content">
          <h3 style="${isDone ? 'text-decoration: line-through; color: #9CA3AF;' : ''}">${item.title}</h3>
          <p>${item.sub}</p>
        </div>
      </div>
    `;
  }).join("");

  el.querySelectorAll(".workout-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const item = items.find(i => i.id == id);
      if (item) openWorkoutModal(item, "do");
    });
  });
}

function updateWorkoutProgressBar() {
  // 1. ดึงข้อมูลดิบจาก LocalStorage มาก่อนเลย (ไม่ต้องรอตัวแปร Global)
  const userData = JSON.parse(localStorage.getItem(ukey("fit_user")));
  const total = window.todayWorkout ? window.todayWorkout.length : 0;
  
  // นับจำนวนท่าที่ทำเสร็จแล้ว (อิงจากประวัติที่โหลดมา)
  const done = completedWorkouts ? completedWorkouts.length : 0;
  const percentage = total > 0 ? (done / total) * 100 : 0;

  // 2. อัปเดตความยาวหลอด Progress
  const progressBar = document.getElementById("workout-progress-fill");
  if (progressBar) {
    progressBar.style.width = percentage + "%";
  }

  // 3. Render ข้อความวันที่และสถานะ
  const statusText = document.querySelector(".workout-progress-text");
  if (statusText) {
    let dayText = "";

    // ถ้าเจอข้อมูล User ใน LocalStorage ให้คำนวณวันที่ทันที
    if (userData && userData.startDate) {
      const start = new Date(userData.startDate);
      const today = new Date();
      start.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = today - start;
      const dayDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const duration = userData.duration || 30;

      if (dayDiff > 0 && dayDiff <= duration) {
        dayText = `วันที่ ${dayDiff}/${duration} • `;
      } else if (dayDiff > duration) {
        dayText = `จบโปรแกรมแล้ว • `;
      } else {
        dayText = `เริ่มแผนใหม่พรุ่งนี้ • `;
      }
    }

    // สั่งวาดลง HTML ทันที
    statusText.innerHTML = `<strong>${dayText}</strong>เป้าหมายวันนี้ • <strong>ทำแล้ว ${done}/${total} ท่า</strong>`;
  }
}


function playSound(type) {
    // ปิดการทำงานไว้ก่อนเพื่อไม่ให้ Error audioCtx 
    console.log("Sound played (muted):", type);
}

// [Toast]
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.cssText = `
    position:fixed; top:20px; right:20px;
    padding:12px 24px; border-radius:50px;
    color:#fff; font-family:'Kanit',sans-serif;
    box-shadow:0 5px 15px rgba(0,0,0,0.2);
    z-index:9999;
    transition:all 0.5s ease;
    opacity:0; transform:translateY(-20px);
  `;

  if (type === 'success') toast.style.background = 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)';
  else if (type === 'info') toast.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  else if (type === 'warning') toast.style.background = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 100);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

/* =========================================
   3. DATA & STORAGE
   ========================================= */
let workoutHistory = JSON.parse(
  localStorage.getItem("fit_workout_history")
) || [];

let currentCalDate = new Date();
let activeTitle = null;
let activeMode = "do"; // เพิ่มตัวแปรเก็บ mode ปัจจุบัน
let activeImgUrl = ""; // รูป/ภาพท่าใน Modal (สำหรับโหมดดูเฉยๆ)

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}



/* =========================================
   4. WORKOUT MODAL SYSTEM (ปรับปรุงแล้ว)
   ========================================= */
function openWorkoutModal(item, mode = "do") {
  if (!item) return;

  activeTitle = item.title;
  window.activeItem = item;
  activeMode = mode;

  // 1. ตั้งข้อมูลพื้นฐาน
  setText('modal-title', item.title || "Workout Detail");
  setText('instruction-text', item.instruction || "ไม่มีข้อมูลคำแนะนำ");

  const imgEl = document.getElementById('modal-image');
  if (imgEl) {
    imgEl.src = item.img || "";
    imgEl.style.display = item.img ? "block" : "none";
  }

  const planEl = document.getElementById('modal-plan-text');
  const finishBtn = document.getElementById("finish-workout-btn");

  if (mode === "view") {
    // --- 📖 โหมดหน้าคลัง (ดูเฉยๆ) ---
    if (planEl) planEl.style.display = "none";
    if (finishBtn) finishBtn.style.display = "none";
    showToast(`📖 ข้อมูลท่า: ${item.title}`, 'info');
  } else {
    // --- 🏋️ โหมด Dashboard (บันทึกจริง) ---
    if (planEl) {
      planEl.style.display = "block";
      planEl.innerText = item.sets > 1 ? `${item.repsGuide} x ${item.sets} เซ็ต` : item.repsGuide;
    }

    if (finishBtn) {
      finishBtn.style.display = "block";
      finishBtn.innerText = "จบวันนี้";
      finishBtn.style.background = "#333";

      // ✅ เพิ่ม Logic การบันทึก API กลับเข้าไปตรงนี้
      finishBtn.onclick = async () => {
        if (finishBtn.disabled) return;
        finishBtn.disabled = true;

        const token = localStorage.getItem("token");
        try {
          const res = await fetch(`${API_BASE}/api/workout-log`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              date: getTodayKey(),
              title: activeTitle,
              exerciseId: window.activeItem?.id || null,
              sets: window.activeItem?.sets || null,
              reps: window.activeItem?.isTime ? null : (window.activeItem?.reps || null),
              duration: window.activeItem?.isTime ? window.activeItem?.reps : null,
              note: activeTitle
            })
          });

          const result = await res.json();
          if (result.duplicate) {
            showToast("บันทึกท่านี้ไปแล้ววันนี้ 👍", "info");
          } else {
            // ✅ เรียกฟังก์ชันอัปเดตสถานะต่างๆ หลังบันทึกสำเร็จ
            await markTodayAsDone();
            showToast("บันทึกเรียบร้อย 💪", "success");
          }
          closeTimerModal();
        } catch (err) {
          console.error(err);
          showToast("เกิดข้อผิดพลาดในการบันทึก", "warning");
        } finally {
          finishBtn.disabled = false;
        }
      };
    }
    playSound('beep');
  }

  document.getElementById("timer-modal").style.display = "flex";
}

function setupListTabs() {
  const btns = document.querySelectorAll(".mission-tabs-2 .tab-btn");
  const panelWorkout = document.getElementById("panel-workout");
  const panelMeal = document.getElementById("panel-meal");

  if (!btns.length || !panelWorkout || !panelMeal) return;

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      if (tab === "workout") {
        panelWorkout.classList.add("active");
        panelMeal.classList.remove("active");
      } else {
        panelMeal.classList.add("active");
        panelWorkout.classList.remove("active");
      }
    });
  });
}

/* =========================================
   6. CALENDAR FUNCTIONS
   ========================================= */
function pad2(n) { return String(n).padStart(2, '0'); }

function formatDate(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function getTodayMonthValue() {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`;
}

function buildMonthCalendar(monthValue) {
  const cal = document.getElementById('month-calendar');
  const hidden = document.getElementById('selected-dates');
  const hint = document.getElementById('month-hint');
  if (!cal || !hidden) return;

  const [Y, M] = monthValue.split('-').map(Number);
  const first = new Date(Y, M - 1, 1);
  const last = new Date(Y, M, 0);
  const daysInMonth = last.getDate();
  const startWeekday = first.getDay();

  const selected = new Set(
    String(hidden.value || "")
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );

  cal.innerHTML = '';
  const heads = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  heads.forEach(h => {
    const el = document.createElement('div');
    el.className = 'cal-head';
    el.textContent = h;
    cal.appendChild(el);
  });

  for (let i = 0; i < startWeekday; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day muted';
    blank.textContent = '';
    cal.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDate(Y, M, d);

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    if (selected.has(dateKey)) cell.classList.add('selected');

    cell.onclick = () => {
      cell.classList.toggle('selected');
      if (cell.classList.contains('selected')) selected.add(dateKey);
      else selected.delete(dateKey);

      hidden.value = Array.from(selected).sort().join(',');
      if (hint) hint.textContent = `เลือกแล้ว ${selected.size} วัน`;
    };

    cal.appendChild(cell);
  }

  if (hint) hint.textContent = `เลือกแล้ว ${selected.size} วัน`;
}

async function markTodayAsDone() {
  const key = getTodayKey();

  const dailyLog = getDailyLog();

  if (!dailyLog[key]) {
    dailyLog[key] = {
      workouts: [],
      nutrition: null
    };
  }
  dailyLog[key].workouts.push({
    completed: true,
    timestamp: Date.now()
  });

  saveDailyLog(dailyLog);

  await loadWorkoutLogs(); // รีโหลดประวัติการออกกำลังกายเพื่ออัปเดตข้อมูลล่าสุด
  await loadExercisesFromAPI(); // รีโหลดข้อมูลท่าออกกำลังกายเพื่ออัปเดตสถานะท่าที่ทำแล้ว

  renderWeeklyStreak();
  updateStreakDisplay();
  updateWeeklyChart();

  showToast("✅ บันทึกการฝึกสำเร็จ!", "success");
}


function renderWeeklyStreak() {
  const wrapper = document.querySelector('.calendar-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  for (let i = -2; i <= 2; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const card = document.createElement('div');
    card.className = 'day-card';

    if (i === 0) card.classList.add('active');
    if (workoutHistory.some(item => item.date.slice(0, 10) === key)) {
      card.classList.add('done');

    }
    else if (i < 0) card.classList.add('missed');

    card.innerHTML = `<span class="day-name">${days[d.getDay()]}</span><span class="day-num">${d.getDate()}</span><div class="status-dot"></div>`;
    wrapper.appendChild(card);
  }
}

function updateWeeklyChart() {
  const bars = document.querySelectorAll(".chart-bar");
  if (!bars.length) return;

  const today = new Date();

  bars.forEach(bar => {
    const dayIndex = parseInt(bar.dataset.day); // 0-6
    const d = new Date(today);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 0=อาทิตย์
    d.setDate(startOfWeek.getDate() + dayIndex);

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const done = workoutHistory.some(item =>
      item.date.slice(0, 10) === key
    );
    if (done) {
      bar.style.height = "100%";
      bar.classList.add("active");
      bar.setAttribute("data-val", "✔");
    } else {
      bar.style.height = "20%";
      bar.classList.remove("active");
      bar.setAttribute("data-val", "");
    }
  });
}

async function loadWorkoutLogs() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/workout-log`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();

    if (Array.isArray(data)) {
      workoutHistory = data;
      updateWeeklyChart();
      renderWeeklyStreak();
      updateStreakDisplay();
    }

  } catch (err) {
    console.error("Error loading workout logs:", err);
  }
}


function updateStreakDisplay() {
  let streak = 0;
  const getKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const d = new Date();
  if (workoutHistory.some(item => item.date === getKey(d))) {
    streak++;
  }
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);

  while (workoutHistory.some(item => item.date === getKey(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const badge = document.getElementById('streak-badge');
  const countEl = document.getElementById('streak-count');

  if (badge && countEl) {
    if (streak > 0) {
      badge.style.display = 'flex';
      countEl.innerText = streak;
    } else {
      badge.style.display = 'none';
    }
  }
}

async function loadFoodLibrary() {

  foodLibrary = []; // 🔥 รีเซ็ตก่อนทุกครั้ง

  try {
    const res = await fetch(`${API_BASE}/api/foods`);
    const data = await res.json();

    foodLibrary = data.map(f => ({
      id: f.id,
      name: f.nameTh,
      kcal: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      img: f.imageUrl
    }));

    console.log("Mapped foodLibrary:", foodLibrary);

    renderFoodLibrary();
    renderDashboardMeals();

  } catch (err) {
    console.error(err);
  }
}


/* =========================================
   7. DOM CONTENT LOADED (ปรับปรุงแล้ว)
   ========================================= */
document.addEventListener("DOMContentLoaded", async () => {
  // ✅ 1. [Render ทันที] ดึงจาก LocalStorage มาโชว์ก่อน (แก้ปัญหา Refresh แล้วหาย)
  // ตรวจสอบให้มั่นใจว่าฟังก์ชันเหล่านี้ดึงค่าจาก localStorage.getItem() เป็นหลัก
  loadUserData(); 
  loadProfilePage();
  updateWorkoutProgressBar(); 

  // ✅ 2. [Sync ข้อมูล] โหลดโปรไฟล์จาก Server มาอัปเดต LocalStorage ให้เป็นปัจจุบัน
  await loadProfileFromServer(); 

  // ✅ 3. [โหลด Data หนัก] ใช้ Promise.all เพื่อความเร็ว
  await Promise.all([
    loadFoodLibrary(),
    loadExercisesFromAPI(),
    loadWorkoutLogs()
  ]);

  // ✅ 4. [Re-Render] อัปเดตหน้าจออีกครั้งด้วยข้อมูลล่าสุดจาก Server
  // การเรียกซ้ำตรงนี้จะทำให้ตัวเลขแคลอรี่หรือวันที่แม่นยำขึ้นถ้ามีการอัปเดตจากเครื่องอื่น
  loadUserData(); 
  loadProfilePage(); // 🔥 เพิ่มตรงนี้เข้าไปด้วย เพื่อให้ Input ในหน้าตั้งค่าอัปเดตตาม Server
  updateWeeklyChart();
  
  await loadTodayMeals(); 
  await loadTodayWorkout(); 
  
  // สั่งวาดการ์ดอาหารและเช็ค Onboarding
  renderDashboardMeals();
  initPwStrength();

  if (!localStorage.getItem(ukey("fit_user"))) {
    const wizard = document.getElementById("onboarding-modal");
    if (wizard) {
      wizard.style.display = "flex";
      showStep(1);
    }
  }
});



// Set Date
const dateElem = document.getElementById('current-date');
if (dateElem) {
  dateElem.innerText = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Month calendar init
const monthInp = document.getElementById('workout-month');
const hiddenDates = document.getElementById('selected-dates');

if (monthInp && hiddenDates) {
  if (!monthInp.value) monthInp.value = getTodayMonthValue();
  buildMonthCalendar(monthInp.value);

  monthInp.addEventListener('change', () => {
    buildMonthCalendar(monthInp.value);
  });
}

// Streak & Level
renderWeeklyStreak();
updateStreakDisplay();

const levelInput = document.getElementById("inp-level");
if (levelInput) updateLevelText(levelInput.value);

// Health checkboxes
const checks = document.querySelectorAll('#step-3 .checkbox-group input[type="checkbox"]');
const none = document.querySelector('#step-3 .checkbox-group input[value="none"]');

checks.forEach(chk => {
  chk.addEventListener("change", () => {
    if (!none) return;

    if (chk.value === "none" && chk.checked) {
      checks.forEach(c => { if (c.value !== "none") c.checked = false; });
    }

    if (chk.value !== "none" && chk.checked) {
      none.checked = false;
    }

    const anyOther = Array.from(checks).some(c => c.value !== "none" && c.checked);
    if (!anyOther) none.checked = true;
  });
});

// ✅ Setup List Tabs (Workout/Meal selection)
setupListTabs();



// ✅ UNIFIED EVENT DELEGATION (ไม่ซ้ำซ้อน)
setTimeout(() => {
  // Dashboard - โหมดทำจริง
  const dashboardPage = document.getElementById('dashboard');
  if (dashboardPage) {

    console.log('✅ Dashboard Event Delegation ติดตั้งแล้ว');
  }

  // Workout Arena - โหมดดูเฉยๆ
  const arenaPage = document.getElementById('exercise');
  if (arenaPage) {

    console.log('✅ Arena Event Delegation ติดตั้งแล้ว');
  }
}, 300);

// ✅ Modal Buttons
const logBtn = document.getElementById('log-set-btn');
const finishBtn = document.getElementById('finish-workout-btn');

if (logBtn) {
  logBtn.addEventListener('click', () => {
    // โหมดดูเฉยๆ: แค่เปิดดูเพิ่ม (ไม่บันทึก)
    if (activeMode === "view") {
      if (activeImgUrl) window.open(activeImgUrl, "_blank");
      else showToast("ℹ️ โหมดดูเฉยๆ: ไม่มีรายละเอียดเพิ่ม", "info");
      return;
    }

    if (!activeTitle) return;

    const repsInput = document.getElementById('reps-input');
    const noteInput = document.getElementById('note-input');
    const data = workoutDB[activeTitle];

    const reps = parseInt(repsInput?.value || "", 10);
    if (!reps || reps <= 0) {
      showToast("⚠️ ใส่จำนวนครั้ง/วินาที ก่อนบันทึก", "warning");
      return;
    }

    const dateKey = getTodayKey();
    const note = noteInput?.value || "";
    const setNo = activeSetIndex + 1;

    saveSet(dateKey, activeTitle, setNo, reps, note);
    activeSetIndex++;

    if (activeSetIndex >= data.sets) {
      showToast(`✅ ครบ ${data.sets} เซ็ตแล้ว!`, "success");
      markTodayAsDone();
      closeTimerModal();
    } else {
      setText('set-current', activeSetIndex + 1);
      showToast(`บันทึกเซ็ต ${setNo}/${data.sets} แล้ว ✅`, "success");
      playSound('beep');
    }
  });
}

if (finishBtn) {
  finishBtn.addEventListener('click', () => {
    // โหมดดูเฉยๆ: แค่ปิดโมดอล
    if (activeMode === "view") {
      closeTimerModal();
      return;
    }

    markTodayAsDone();
    showToast("✅ จบวันนี้แล้ว!", "success");
    playSound('finish');
    closeTimerModal();
  });
}

// Modal close on backdrop click
window.onclick = function (e) {
  if (e.target === document.getElementById('timer-modal')) closeTimerModal();
  if (e.target === document.getElementById('full-calendar-modal')) closeCalendarModal();
};

console.log('✅ FitLife Easy Fixed Version โหลดเสร็จสมบูรณ์');


/* =========================================
   9. CALENDAR MODAL
   ========================================= */
function openCalendarModal() {
  const modal = document.getElementById('full-calendar-modal');
  if (modal) {
    modal.style.display = "flex";
    renderFullCalendar();
  }
}

function closeCalendarModal() {
  const modal = document.getElementById('full-calendar-modal');
  if (modal) modal.style.display = "none";
}

function changeMonth(step) {
  currentCalDate.setMonth(currentCalDate.getMonth() + step);
  renderFullCalendar();
}

function renderFullCalendar() {
  const y = currentCalDate.getFullYear(), m = currentCalDate.getMonth();
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  setText('current-month-year', `${months[m]} ${y + 543}`);

  const grid = document.getElementById('full-calendar-grid');
  if (!grid) return;

  grid.innerHTML = "";
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let dateCount = 1;
  for (let i = 0; i < 6; i++) {
    const row = document.createElement('div');
    row.className = 'week-row';

    for (let j = 0; j < 7; j++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';

      if ((i === 0 && j < firstDay) || dateCount > daysInMonth) {
        cell.classList.add('empty');
      } else {
        const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(dateCount).padStart(2, '0')}`;
        const thisDate = new Date(y, m, dateCount);

        if (dateCount === now.getDate() && m === now.getMonth() && y === now.getFullYear()) cell.classList.add('today');
        else if (workoutHistory.some(item => item.date.slice(0, 10) === key)) {
          cell.classList.add('done');
        }
        else if (thisDate < now) cell.classList.add('missed');

        cell.innerHTML = `<span class="day-label">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][j]}</span><span class="date-num">${dateCount}</span><div class="status-dot"></div>`;
        dateCount++;
      }

      row.appendChild(cell);
    }

    grid.appendChild(row);
    if (dateCount > daysInMonth) break;
  }
}

function switchHistoryMode(mode) {
  const chartView = document.getElementById('view-chart');
  const calView = document.getElementById('view-calendar');
  if (!chartView || !calView) return;

  if (mode === 'chart') {
    chartView.style.display = 'flex';
    calView.style.display = 'none';
  } else {
    chartView.style.display = 'none';
    calView.style.display = 'block';
    renderMiniCalendar();
  }
}

function renderMiniCalendar() {
  const container = document.getElementById('mini-calendar-days');
  const monthLabel = document.getElementById('mini-cal-month');
  if (!container) return;

  container.innerHTML = "";
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  if (monthLabel) monthLabel.innerText = `${thaiMonths[month]} ${year + 543}`;

  const daysName = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  daysName.forEach(d => {
    container.innerHTML += `<div class="mini-cal-day-name">${d}</div>`;
  });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) container.innerHTML += `<div></div>`;

  for (let i = 1; i <= daysInMonth; i++) {
    let className = 'mini-cal-date';
    const checkKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

    if (workoutHistory.some(item => item.date === checkKey)) {
      className += ' workout-done';
    }
    if (i === now.getDate()) className += ' today';

    container.innerHTML += `<div class="${className}">${i}</div>`;
  }
}

function startOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.style.display = 'flex';
    showStep(1);
  }
}

function changeStep(n) {
  if (n === 1 && currentStep === 1) {
    const name = document.getElementById('inp-name')?.value;
    const weight = document.getElementById('inp-weight')?.value;
    if (!name || !weight) {
      showToast("⚠️ กรอกข้อมูลให้ครบก่อนครับ", "warning");
      return;
    }
  }
  currentStep += n;
  showStep(currentStep);
}

function showStep(n) {
  for (let i = 1; i <= totalSteps; i++) {
    const step = document.getElementById('step-' + i);
    if (step) step.classList.remove('active');
  }

  const currentStepElem = document.getElementById('step-' + n);
  if (currentStepElem) currentStepElem.classList.add('active');

  const progress = document.getElementById('wizard-progress');
  if (progress) progress.style.width = ((n / totalSteps) * 100) + '%';

  setText('wizard-title', `Step ${n}: ${["ข้อมูลพื้นฐาน", "เป้าหมาย", "ระดับ", "โปรแกรม"][n - 1]}`);

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const finishBtn = document.getElementById('finish-btn');

  if (prevBtn) prevBtn.disabled = (n === 1);
  if (nextBtn) nextBtn.style.display = (n === totalSteps) ? 'none' : 'inline-block';
  if (finishBtn) finishBtn.style.display = (n === totalSteps) ? 'inline-block' : 'none';
}

function selectDuration(elem, days) {
  [...elem.parentElement.children].forEach(c => c.classList.remove('selected'));
  elem.classList.add('selected');
  document.getElementById('inp-duration').value = days;
}

// Set default start date to today when wizard opens
function startOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.style.display = 'flex';
  currentStep = 1;
  showStep(1);
  // set default start date = today
  const dateInput = document.getElementById('inp-start-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  // set default duration = 30
  const firstCard = document.querySelector('#step-4 .select-card');
  if (firstCard) firstCard.classList.add('selected');
}

function selectOption(elem, type, value) {
  [...elem.parentElement.children].forEach(c => c.classList.remove('selected'));
  elem.classList.add('selected');
  const input = document.getElementById('selected-' + type);
  if (input) input.value = value;
}

function onGoalChange(goal) {
  const focusCards = document.querySelectorAll('#focus-grid .select-card');
  const focusNote = document.getElementById('focus-note');
  const levelWrapper = document.getElementById('level-range-wrapper');
  const levelNote = document.getElementById('level-note');
  const levelInput = document.getElementById('inp-level');
  const focusInput = document.getElementById('selected-focus');
  const equipInput = document.getElementById('selected-equipment');

  if (goal === 'lose-fat') {
    // 1. [ล็อก] focus → auto full-body (เหมือนเดิม)
    focusCards.forEach(c => {
      c.style.opacity = '0.4';
      c.style.pointerEvents = 'none';
      c.classList.remove('selected');
    });
    const fullBodyCard = document.getElementById('focus-full-body');
    if (fullBodyCard) fullBodyCard.classList.add('selected');
    if (focusInput) focusInput.value = 'full-body';
    if (focusNote) focusNote.style.display = 'block';

    // 2. [ปลดล็อก] level → ให้เลือกได้เอง (แก้ไขตรงนี้!)
    if (levelWrapper) {
      levelWrapper.style.opacity = '';      // เอาสีเทาออก
      levelWrapper.style.pointerEvents = ''; // ให้กลับมาเลื่อนได้
    }
    if (levelNote) levelNote.style.display = 'none'; // ซ่อนตัวหนังสือสีแดงที่บอกว่าล็อกอัตโนมัติ

    // 3. [ล็อก] equipment → auto bodyweight (เหมือนเดิม)
    const equipCards = document.querySelectorAll('#step-2 .select-card[onclick*="equipment"]');
    equipCards.forEach(c => {
      c.style.opacity = '0.4';
      c.style.pointerEvents = 'none';
      c.classList.remove('selected');
    });
    const bwCard = document.querySelector('#step-2 .select-card[onclick*="bodyweight"]');
    if (bwCard) bwCard.classList.add('selected');
    if (equipInput) equipInput.value = 'bodyweight';

  } else { // build-muscle
    // [ปลดล็อกทุกอย่าง]
    focusCards.forEach(c => {
      c.style.opacity = '';
      c.style.pointerEvents = '';
    });
    if (focusNote) focusNote.style.display = 'none';

    if (levelWrapper) {
      levelWrapper.style.opacity = '';
      levelWrapper.style.pointerEvents = '';
    }
    if (levelNote) levelNote.style.display = 'none';

    const equipCards = document.querySelectorAll('#step-2 .select-card[onclick*="equipment"]');
    equipCards.forEach(c => {
      c.style.opacity = '';
      c.style.pointerEvents = '';
    });
  }
}

function updateLevelText(val) {
  const map = { "1": "ง่าย", "2": "ปานกลาง", "3": "ยาก" };
  const el = document.getElementById("level-text");
  if (el) el.innerText = map[String(val)] || "ง่าย";
}

async function finishWizard() {
  const name = document.getElementById('inp-name')?.value;
  const weight = parseFloat(document.getElementById('inp-weight')?.value || "0");
  const height = parseFloat(document.getElementById('inp-height')?.value || "0");
  const age = parseInt(document.getElementById('inp-age')?.value || "25");
  const gender = document.getElementById("inp-gender")?.value || "male";

  if (!name || !weight || !height) {
    showToast("⚠️ กรุณากรอกข้อมูลให้ครบ", "warning");
    return;
  }

  const goal = document.getElementById('selected-goal')?.value || 'maintain';
  const focus = document.getElementById('selected-focus')?.value || 'full-body';
  const equipment = document.getElementById('selected-equipment')?.value || 'gym';

  const datesStr = document.getElementById('selected-dates')?.value || "";
  const workoutDates = datesStr.split(',').map(s => s.trim()).filter(Boolean);

  // =========================
  // 1️⃣ BMI
  // =========================
  const hm = height / 100;
  const bmi = weight / (hm * hm);
  let bmiStatus = bmi < 18.5 ? "ผอม"
    : (bmi < 23 ? "ปกติ"
      : (bmi < 25 ? "ท้วม"
        : "อ้วน"));

  // =========================
  // 2️⃣ BMR
  // =========================
  let bmr;
  if (gender === "male") {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }

  // =========================
  // 3️⃣ Activity Multiplier
  // =========================
  let activityMultiplier = 1.35;
  const levelRaw = document.getElementById("inp-level")?.value || "1";
  const levelMap = { "1": "easy", "2": "medium", "3": "hard" };
  const level = levelMap[levelRaw] || "easy";

  if (level === "easy") activityMultiplier = 1.375;
  if (level === "medium") activityMultiplier = 1.55;
  if (level === "hard") activityMultiplier = 1.725;

  let tdee = bmr * activityMultiplier;

  // =========================
  // 4️⃣ Goal Adjustment
  // =========================
  if (goal === "lose-fat") tdee -= 400;
  else if (goal === "build-muscle") tdee += 300;

  // =========================
  // 5️⃣ Macro
  // =========================
  const protein = weight * 2;        // 2g / kg
  const fat = weight * 0.8;          // 0.8g / kg
  const carbs = (tdee - (protein * 4 + fat * 9)) / 4;

  // =========================
  // 6️⃣ บันทึกข้อมูล
  // =========================
  const startDate = document.getElementById('inp-start-date')?.value || new Date().toISOString().split('T')[0];
  const duration = parseInt(document.getElementById('inp-duration')?.value || "30");

  localStorage.setItem(ukey("fit_user"), JSON.stringify({
    name,
    weight,
    height,
    age,
    gender,
    goal,
    focus,
    workoutDates,
    tdee: Math.round(tdee),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    bmi: Number(bmi.toFixed(2)),
    bmiStatus,
    startDate,
    duration,
    equipment
  }));

  const token = localStorage.getItem("token");
  if (token) {
    try {
      await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name, age, gender, weight, height,
          goal, focus, level,
          tdee: Math.round(tdee),
          protein: Math.round(protein),
          fat: Math.round(fat),
          carbs: Math.round(carbs),
          bmi: Number(bmi.toFixed(2)),
          startDate,
          duration,
          equipment
        })
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  }
  loadUserData();

  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.style.display = 'none';

  showToast(`ยินดีต้อนรับ ${name}!`, "success");
  navigateTo('dashboard');
}


function openFoodLibrary() {
  navigateTo("food");

}

function updateDashboardFromProfile() {
  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!user) return;

  const tdee = user.tdee;

  setText("dash-cal-target", `เป้าหมาย ${tdee.toLocaleString()} kcal`);

  updateDashboardNutrition();

  setText("bmi-val", user.bmi.toFixed(1));
}

/* =========================================
   11. LOAD USER DATA
   ========================================= */
function loadUserData() {
  const data = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!data) return;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "อรุณสวัสดิ์" : (hour < 18 ? "สวัสดี" : "สวัสดีตอนค่ำ");
  setText('user-name-display', `${greeting}, ${data.name}`);

  // แสดงข้อมูลร่างกายพื้นฐาน
  setText('dash-weight', data.weight);
  setText('dash-height', data.height);
  setText('dash-bmi', data.bmi.toFixed(2));
  setText('bmi-val', data.bmi.toFixed(2));
  setText('bmi-status', data.bmiStatus);

  const statusEl = document.getElementById('bmi-status');
  if (statusEl) {
    if (data.bmi < 18.5) statusEl.style.color = "#FF9966";
    else if (data.bmi < 23) statusEl.style.color = "#4CAF50";
    else if (data.bmi < 25) statusEl.style.color = "#FFC107";
    else statusEl.style.color = "#FF5252";
  }

  const tdee = data.tdee;
  setText('dash-cal-target', `เป้าหมาย ${tdee.toLocaleString()} kcal`);

  updateWaterUI();
  updateStreakDisplay();
}

/* =========================================
   12. FOOD MODAL
   ========================================= */

function closeFoodModal() {
  const modal = document.getElementById('food-modal');
  if (modal) modal.style.display = 'none';

  const nameInput = document.getElementById('food-name');
  const calInput = document.getElementById('food-cal');
  const pInput = document.getElementById('food-p');
  const cInput = document.getElementById('food-c');
  const fInput = document.getElementById('food-f');

  if (nameInput) nameInput.value = '';
  if (calInput) calInput.value = '';
  if (pInput) pInput.value = '';
  if (cInput) cInput.value = '';
  if (fInput) fInput.value = '';
}

function saveFoodFromModal() {
  const name = document.getElementById('food-name')?.value;
  const cal = parseInt(document.getElementById('food-cal')?.value || "0");
  const p = parseInt(document.getElementById('food-p')?.value || "0");
  const c = parseInt(document.getElementById('food-c')?.value || "0");
  const f = parseInt(document.getElementById('food-f')?.value || "0");

  if (!name) {
    showToast("⚠️ กรุณาใส่ชื่อเมนู", "warning");
    return;
  }


  addFoodItem(name, cal, p, c, f);
  closeFoodModal();
}

function openSearchModal() {
  closeAllModals();
  const modal = document.getElementById('modal-search');
  if (modal) modal.style.display = 'flex';
}

function switchToManual() {
  closeAllModals();
  const modal = document.getElementById('modal-manual');
  if (modal) modal.style.display = 'flex';
}

function closeAllModals() {
  const searchModal = document.getElementById('modal-search');
  const manualModal = document.getElementById('modal-manual');
  if (searchModal) searchModal.style.display = 'none';
  if (manualModal) manualModal.style.display = 'none';
}


function addWater() {
  waterIntake = Math.min(waterIntake + 250, waterGoal);
  updateWaterUI();
  showToast("💧 เติมน้ำแล้ว!", "info");
}

function updateWaterUI() {
  setText('water-count', waterIntake.toLocaleString());
  const el = document.getElementById('water-fill-level');
  if (el) el.style.height = (waterIntake / waterGoal * 100) + "%";
}

/* =========================================
   14. PROFILE & LOGOUT
   ========================================= */
async function saveProfile() {
  // 1. ถามยืนยัน (ปรับข้อความให้ตรงกับ Logic ใหม่: เปลี่ยนแผนแต่นับวันต่อ)
  const isConfirm = confirm(
    "ยืนยันการเปลี่ยนแปลงข้อมูล?\n\n" +
    "- ข้อมูลร่างกายจะอัปเดตทันที\n" +
    "- ตารางฝึกและอาหารจะปรับตามเป้าหมายใหม่\n" +
    "- วันที่เริ่มต้น (Day) จะยังนับต่อเนื่องจากเดิมครับ"
  );

  if (!isConfirm) return;

  const name = document.getElementById('profile-inp-name')?.value?.trim();
  const weight = parseFloat(document.getElementById('profile-inp-weight')?.value);
  const height = parseFloat(document.getElementById('profile-inp-height')?.value);
  const goal = document.getElementById('goalSelect')?.value;
  const focus = document.getElementById('focusSelect')?.value;
  const level = document.getElementById('levelSelect')?.value;
  const equipment = document.getElementById('equipSelect')?.value || 'gym';

  const btn = document.querySelector('.btn-save-new');
  if (btn) { 
    btn.textContent = "กำลังบันทึก..."; 
    btn.style.opacity = "0.7"; 
    btn.disabled = true;
  }

  // 2. ดึงข้อมูลเดิมจาก LocalStorage เพื่อเอา startDate เดิมมาใช้ (นับวันต่อ)
  const existing = JSON.parse(localStorage.getItem(ukey("fit_user"))) || {};
  const currentStartDate = existing.startDate || new Date().toISOString().split('T')[0];

  // 3. คำนวณค่าร่างกายใหม่ตามข้อมูลที่อัปเดต
  let bmi = null, tdee = null, protein = null, fat = null, carbs = null;
  if (weight && height) {
    bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
    const bmr = 10 * weight + 6.25 * height - 5 * 25 + 5; 
    tdee = Math.round(bmr * 1.55);
    protein = Math.round(weight * 2);
    fat = Math.round((tdee * 0.25) / 9);
    carbs = Math.round((tdee - (protein * 4) - (fat * 9)) / 4);
  }

  // 4. เตรียมข้อมูล (ใช้ currentStartDate เดิม)
  const userData = { 
    name, weight, height, goal, focus, level, equipment, 
    bmi, tdee, protein, fat, carbs,
    startDate: currentStartDate // ✅ นับต่อจากวันเดิม ไม่รีเซ็ต
  };

  // 5. บันทึกข้อมูลลง LocalStorage และ Server
  localStorage.setItem(ukey("fit_user"), JSON.stringify({ ...existing, ...userData }));

  const token = localStorage.getItem("token");
  if (token) {
    try {
      await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(userData)
      });
    } catch (err) { console.error("Save profile error:", err); }
  }

  if (btn) { 
    btn.textContent = "บันทึกและนับวันต่อเรียบร้อย! ✅"; 
    btn.style.opacity = "1"; 
    setTimeout(() => { 
      btn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล'; 
      btn.disabled = false;
    }, 2000); 
  }

  loadProfilePage();
  loadUserData();
  
  // โหลดท่าออกกำลังกายใหม่ให้ตรงกับเป้าหมาย/ระดับที่เพิ่งเปลี่ยน (แต่วันที่ยังนับต่อ)
  if (typeof loadTodayWorkout === 'function') loadTodayWorkout();
}

function loadProfilePage() {
  // 1. ดึงจาก LocalStorage มาก่อนเลย (Render ทันทีไม่ต้องรอ Server)
  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  
  if (!user) {
    console.log("ยังไม่มีข้อมูล User ใน LocalStorage");
    return;
  }

  // 2. ใส่ข้อมูลลงในช่อง Input (ชื่อ, น้ำหนัก, ส่วนสูง)
  const nameInp = document.getElementById('profile-inp-name');
  const weightInp = document.getElementById('profile-inp-weight');
  const heightInp = document.getElementById('profile-inp-height');
  
  if (nameInp) nameInp.value = user.name || '';
  if (weightInp) weightInp.value = user.weight || '';
  if (heightInp) heightInp.value = user.height || '';

  // 3. Render ตัวเลขบน Header
  setText('profile-name-display', user.name || 'Guest User');
  setText('profile-weight-display', user.weight || '--');
  setText('profile-height-display', user.height || '--');
  setText('profile-bmi-display', user.bmi ? user.bmi.toFixed(1) : '--');
  setText('profile-tdee-display', user.tdee || '--');

  // 4. ตั้งค่า Select ต่างๆ ตามที่เก็บไว้ใน LocalStorage
  const goalSel = document.getElementById('goalSelect');
  const focusSel = document.getElementById('focusSelect');
  const levelSel = document.getElementById('levelSelect');
  const equipSel = document.getElementById('equipSelect');
  
  if (goalSel && user.goal) goalSel.value = user.goal;
  if (focusSel && user.focus) focusSel.value = user.focus;
  if (levelSel && user.level) levelSel.value = user.level;
  if (equipSel && user.equipment) equipSel.value = user.equipment;

  // 5. Logic ล็อกช่องตามเป้าหมาย (ลดไขมันล็อก Focus/Equip แต่เปิด Level)
  const applyRestrictions = (goal) => {
    const isLoseFat = goal === 'lose-fat';
    if (focusSel) { focusSel.disabled = isLoseFat; focusSel.style.opacity = isLoseFat ? '0.5' : '1'; }
    if (equipSel) { equipSel.disabled = isLoseFat; equipSel.style.opacity = isLoseFat ? '0.5' : '1'; }
    if (levelSel) { levelSel.disabled = false; levelSel.style.opacity = '1'; }
  };

  applyRestrictions(user.goal);

  if (goalSel) {
    goalSel.onchange = () => applyRestrictions(goalSel.value);
  }

  loadEmailFromServer(); // อันนี้ค่อยดึงจาก Server เสริมเข้ามา
}
async function loadEmailFromServer() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/profile`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    const emailEl = document.getElementById('profile-email-display');
    if (emailEl && data.email) emailEl.value = data.email;
  } catch (err) {
    console.error("Load email error:", err);
  }
}

function toggleChangePw() {
  const panel = document.getElementById('change-pw-panel');
  const btn = document.getElementById('btn-pw-toggle');
  if (!panel || !btn) return;
  panel.classList.toggle('open');
  btn.classList.toggle('active');
  // clear fields เมื่อปิด
  if (!panel.classList.contains('open')) {
    ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const fill = document.getElementById('pw-strength-fill');
    const txt = document.getElementById('pw-strength-text');
    if (fill) { fill.style.width = '0'; fill.style.background = ''; }
    if (txt) txt.textContent = '';
  }
}

function togglePwEye(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}

// password strength checker — handled by initPwStrength() called in DOMContentLoaded

function initPwStrength() {
  const pwNew = document.getElementById('pw-new');
  if (pwNew) {
    pwNew.addEventListener('input', () => {
      const val = pwNew.value;
      const fill = document.getElementById('pw-strength-fill');
      const txt = document.getElementById('pw-strength-text');
      if (!fill || !txt) return;
      let strength = 0;
      if (val.length >= 6) strength++;
      if (val.length >= 10) strength++;
      if (/[A-Z]/.test(val)) strength++;
      if (/[0-9]/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val)) strength++;
      const levels = [
        { w: '20%', color: '#EF4444', label: 'อ่อนมาก' },
        { w: '40%', color: '#F59E0B', label: 'อ่อน' },
        { w: '60%', color: '#F59E0B', label: 'ปานกลาง' },
        { w: '80%', color: '#10B981', label: 'แข็งแรง' },
        { w: '100%', color: '#059669', label: 'แข็งแรงมาก!' },
      ];
      const lv = val.length === 0 ? null : levels[Math.min(strength - 1, 4)];
      if (lv) { fill.style.width = lv.w; fill.style.background = lv.color; txt.textContent = lv.label; txt.style.color = lv.color; }
      else { fill.style.width = '0'; txt.textContent = ''; }
    });
  }
}

async function changePassword() {
  const current = document.getElementById('pw-current')?.value?.trim();
  const newPw = document.getElementById('pw-new')?.value?.trim();
  const confirm = document.getElementById('pw-confirm')?.value?.trim();
  const btn = document.querySelector('.btn-save-pw');

  if (!current || !newPw || !confirm) {
    showToast("⚠️ กรอกรหัสผ่านให้ครบทุกช่อง", "warning"); return;
  }
  if (newPw.length < 6) {
    showToast("⚠️ รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", "warning"); return;
  }
  if (newPw !== confirm) {
    showToast("⚠️ รหัสผ่านใหม่ไม่ตรงกัน", "warning"); return;
  }

  if (btn) { btn.textContent = "กำลังเปลี่ยน..."; btn.style.opacity = "0.7"; }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/api/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ currentPassword: current, newPassword: newPw })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast("❌ " + (data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ"), "warning");
      if (btn) { btn.innerHTML = '<i class="fas fa-key"></i> ยืนยันเปลี่ยนรหัสผ่าน'; btn.style.opacity = "1"; }
      return;
    }

    showToast("✅ เปลี่ยนรหัสผ่านสำเร็จ!", "success");
    toggleChangePw(); // ปิด panel + clear fields
    if (btn) { btn.innerHTML = '<i class="fas fa-key"></i> ยืนยันเปลี่ยนรหัสผ่าน'; btn.style.opacity = "1"; }
  } catch (err) {
    showToast("❌ เกิดข้อผิดพลาด", "warning");
    if (btn) { btn.innerHTML = '<i class="fas fa-key"></i> ยืนยันเปลี่ยนรหัสผ่าน'; btn.style.opacity = "1"; }
  }
}

function toggleEditPanel() {
  const panel = document.getElementById('edit-panel');
  const btn = document.querySelector('.profile-edit-btn');
  if (!panel) return;
  panel.classList.toggle('open');
  if (btn) btn.innerHTML = panel.classList.contains('open')
    ? '<i class="fas fa-times"></i> ปิด'
    : '<i class="fas fa-pen"></i> แก้ไขข้อมูล';
}

function toggleHistory(type) {
  const card = document.getElementById(type + '-history-card');
  if (!card) return;
  card.classList.toggle('open');
  if (card.classList.contains('open')) {
    if (type === 'workout') loadWorkoutHistory();
    if (type === 'meal') loadMealHistory();
  }
}

function logout() {
  if (confirm("ออกจากระบบ?")) {
    localStorage.removeItem("login");
    localStorage.removeItem(ukey("fit_user"));
    window.location.replace("login_new.html");
  }
}

console.log('✅ FitLife Easy - Fixed & Optimized Version โหลดสมบูรณ์');

// ===== Dashboard Meal Detail (Quick View) =====
window.openDashMealDetail = function (data) {
  const modal = document.getElementById('dash-meal-modal');
  if (!modal) {
    console.error("❌ ไม่พบ Modal ID: dash-meal-modal");
    return;
  }

  // ดึง Element ต่างๆ (ใช้ ? กันพังกรณีหา ID ไม่เจอ)
  const titleEl = document.getElementById('dash-meal-title');
  const subEl = document.getElementById('dash-meal-sub');
  const imgEl = document.getElementById('dash-meal-img');
  const kcalEl = document.getElementById('dash-kcal');
  const pEl = document.getElementById('dash-p');
  const cEl = document.getElementById('dash-c');
  const fEl = document.getElementById('dash-f');

  // ใส่ข้อมูล (รองรับทั้ง kcal และ calories)
  if (titleEl) titleEl.textContent = data?.title || data?.name || 'รายละเอียดอาหาร';

  const energy = data?.kcal ?? data?.calories ?? 0;
  if (energy === 0) Energy = data?.kcal; // กันเหนียว

  if (subEl) subEl.textContent = (energy ? `${energy} kcal` : '');

  if (imgEl) {
    imgEl.src = data?.img || data?.image || '';
    imgEl.style.display = (data?.img || data?.image) ? 'block' : 'none';
  }

  if (kcalEl) kcalEl.textContent = energy + " kcal";
  if (pEl) pEl.textContent = (data?.protein ?? 0) + " g";
  if (cEl) cEl.textContent = (data?.carbs ?? 0) + " g";
  if (fEl) fEl.textContent = (data?.fat ?? 0) + " g";

  // แสดง Modal
  modal.style.display = 'flex';

  // ปรับการปิดให้ชัวร์ขึ้น (รองรับทั้งฟังก์ชันและปิดตรงๆ)
  modal.onclick = (e) => {
    if (e.target === modal) {
      if (typeof closeDashMealDetail === 'function') {
        closeDashMealDetail();
      } else {
        modal.style.display = 'none';
      }
    }
  };
};

function closeDashMealDetail() {
  const modal = document.getElementById('dash-meal-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

function generateMealPlan() {
  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));

  if (!foodLibrary.length) return null;

  const totalCal = user?.tdee || 2000;

  const targets = {
    breakfast: Math.round(totalCal * 0.3),
    lunch: Math.round(totalCal * 0.4),
    dinner: Math.round(totalCal * 0.3),
  };

  const usedIds = new Set();
  const plan = {};

  for (let meal in targets) {
    const target = targets[meal];

    // กรองเมนูที่ยังไม่ถูกใช้
    const available = foodLibrary.filter(f => !usedIds.has(f.id));
    if (!available.length) break;

    // หาเมนูใกล้เคียงที่สุด
    let closest = available.reduce((prev, curr) => {
      return Math.abs(curr.kcal - target) < Math.abs(prev.kcal - target)
        ? curr
        : prev;
    });

    plan[meal] = closest;
    usedIds.add(closest.id);
  }

  return plan;
}

function renderDashboardMeals() {
  const el = document.getElementById("dashboard-meal-list");
  if (!el) return;

  const plan = generateMealPlan();
  if (!plan) {
    el.innerHTML = "<p>ยังไม่มีแผนอาหาร</p>";
    return;
  }

  el.innerHTML = `
  <div class="meal-dashboard-grid">
    ${["breakfast", "lunch", "dinner"].map(meal => {

    // ✅ แก้บรรทัดนี้: ให้มองหาใน selectedMeals ก่อน (ตัวที่เรากดเปลี่ยนเมนู)
    // ถ้าไม่มีข้อมูลใน selectedMeals[meal] ถึงค่อยไปใช้ค่าจาก plan[meal]
    const f = selectedMeals[meal] || plan[meal];

    if (!f) return "";

    const isSaved = !!selectedMeals[meal];

    return `
        <div class="meal-dashboard-card ${isSaved ? "saved" : ""}" 
             data-meal="${meal}" 
             data-id="${f.id}">
             
          ${isSaved ? `<div class="saved-badge">✔</div>` : ""}

          <img src="${f.img || f.image || ''}" class="meal-thumb">

          <div class="meal-info">
            <h4>${mealLabel(meal)}</h4>
            <p class="meal-name">${f.name}</p>
            <span class="meal-cal">${f.kcal} kcal</span>
          </div>
        </div>
      `;
  }).join("")}
  </div>
`;
  attachMealCardEvents();
}

function attachMealCardEvents() {
  document.querySelectorAll(".meal-dashboard-card").forEach(card => {
    card.addEventListener("click", () => {
      const meal = card.dataset.meal;
      const id = card.dataset.id;

      if (selectedMeals && selectedMeals[meal]) {
          console.log(`มื้อ ${meal} บันทึกไปแล้ว กดไม่ได้`);
          return; 
      }

      console.log("CARD CLICKED"); // แก้จาก CLICKEND
      openMealPopup(meal, id);
    });
  });
}

function mealLabel(key) {
  if (key === "breakfast") return "🍳 มื้อเช้า";
  if (key === "lunch") return "🍛 มื้อเที่ยง";
  if (key === "dinner") return "🍽 มื้อเย็น";
}

function splitCalories(tdee) {
  return {
    breakfast: Math.round(tdee * 0.3),
    lunch: Math.round(tdee * 0.4),
    dinner: Math.round(tdee * 0.3)
  };
}

function findBestMeal(targetKcal, usedIds = []) {
  if (!foodLibrary.length) return null;

  let best = null;
  let smallestDiff = Infinity;

  foodLibrary.forEach(food => {

    // ❗ ไม่ให้ซ้ำ
    if (usedIds.includes(food.id)) return;

    const diff = Math.abs(food.kcal - targetKcal);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      best = food;
    }
  });

  return best;
}

function generateDailyMealPlan() {
  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!user || !user.tdee) return null;

  const split = splitCalories(user.tdee);
  const used = [];

  const breakfast = findBestMeal(split.breakfast, used);
  if (breakfast) used.push(breakfast.id);

  const lunch = findBestMeal(split.lunch, used);
  if (lunch) used.push(lunch.id);

  const dinner = findBestMeal(split.dinner, used);

  return {
    breakfast,
    lunch,
    dinner,
    targets: split
  };
}

let currentPopupMeal = null;
let currentPopupKey = null;

let currentselectedFood = null;
let selectedMeals = JSON.parse(localStorage.getItem(ukey("selected_meals"))) || {};

function openMealPopup(mealKey, foodId) {
  // ✅ 1. เพิ่มจุดนี้: เช็คว่ามื้อนี้ (เช่น breakfast) บันทึกไปหรือยัง
  // ถ้าบันทึกแล้ว (มีข้อมูลใน selectedMeals[mealKey]) ให้หยุดทำงานทันที
  if (selectedMeals && selectedMeals[mealKey]) {
    showToast(`📍 มื้อ${mealLabel(mealKey).replace('🍳 ', '').replace('🍛 ', '').replace('🍽 ', '')}บันทึกไปเรียบร้อยแล้วครับ`, "info");
    return; 
  }

  // --- โค้ดเดิมของคุณ ---
  const food = foodLibrary.find(f => String(f.id) === String(foodId));
  if (!food) {
    console.log("❌ ไม่เจออาหาร", foodId);
    return;
  }

  currentPopupMeal = mealKey;
  currentselectedFood = food; 

  document.getElementById("popup-img").src = food.img || "";
  document.getElementById("popup-title").innerText = food.name;
  document.getElementById("popup-meal-label").innerText = mealLabel(mealKey);

  document.getElementById("popup-kcal").innerText = food.kcal + " kcal";
  document.getElementById("popup-p").innerText = "P: " + food.protein;
  document.getElementById("popup-c").innerText = "C: " + food.carbs;
  document.getElementById("popup-f").innerText = "F: " + food.fat;

  const oldList = document.querySelector(".popup-food-list");
  if (oldList) oldList.remove();

  document.getElementById("meal-popup").style.display = "flex";
}

function closeMealPopup() {
  document.getElementById("meal-popup").style.display = "none";
}

async function confirmMeal() {
  if (isSavingMeal) return;
  isSavingMeal = true;

  if (!currentPopupMeal || !currentselectedFood) {
    isSavingMeal = false;
    return;
  }

  // ❌ ลบส่วนที่เช็ค existingMeal && existingMeal.id ออกไปเลยครับ

  const token = localStorage.getItem("token");
  if (!token) {
    showToast("⚠️ กรุณาล็อกอินใหม่", "warning");
    isSavingMeal = false;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/log-meal`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        foodId: currentselectedFood.id,
        mealType: currentPopupMeal
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "บันทึกไม่สำเร็จ");
    }

    closeMealPopup();
    await loadTodayMeals(); // อัปเดตข้อมูลเพื่อให้ติ๊กถูกขึ้นตามเมนูใหม่
    showToast("✅ บันทึกเมนูอาหารเรียบร้อย", "success");

  } catch (err) {
    console.error("Confirm Meal Error:", err);
    showToast(`❌ ${err.message}`, "warning");
  } finally {
    isSavingMeal = false;
  }
}

function changeMeal() {
  const container = document.getElementById("food-select-container");
  if (!container) return;

  // Toggle เปิด-ปิด
  if (container.style.display === "block") {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.style.cssText = `
    display: block;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
    max-height: 200px;
    overflow-y: auto;
  `;

  container.innerHTML = `
    <p style="font-size: 0.85rem; color: #888; margin-bottom: 10px;">จิ้มเพื่อเลือกเมนูใหม่:</p>
    <div style="display: flex; flex-direction: column; gap: 5px;">
      ${foodLibrary.map(f => `
        <div class="simple-food-item" onclick="selectNewMeal('${f.id}')" 
             style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #f0f0f0; border-radius: 8px; cursor: pointer;">
          <span style="font-size: 0.9rem;">${f.name}</span>
          <span style="font-size: 0.8rem; color: #FF6B6B;">${f.kcal} kcal</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ฟังก์ชันช่วยตอนกดเลือก
function selectNewMeal(id) {
  const food = foodLibrary.find(f => String(f.id) === String(id));
  if (!food) return;

  currentselectedFood = food; // อัปเดตตัวแปรหลัก

  // ✅ เพิ่มบรรทัดนี้: อัปเดตข้อมูลในตัวแปรที่จะไปโชว์ที่ Dashboard
  if (typeof currentPopupMeal !== 'undefined') {
    selectedMeals[currentPopupMeal] = {
      id: food.id,
      name: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      img: food.img // หรือ image ตามที่คุณใช้ในระบบ
    };
  }

  // อัปเดต UI หน้า Popup
  document.getElementById("popup-img").src = food.img || "";
  document.getElementById("popup-title").innerText = food.name;
  document.getElementById("popup-kcal").innerText = food.kcal + " kcal";
  document.getElementById("popup-p").innerText = "P: " + food.protein;
  document.getElementById("popup-c").innerText = "C: " + food.carbs;
  document.getElementById("popup-f").innerText = "F: " + food.fat;

  // ปิดรายการเลือก
  document.getElementById("food-select-container").style.display = "none";
}

function updateDashboardNutrition() {
  console.log("Updating dashboard nutrition with selected meals:", selectedMeals);

  let totalCal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  // 1. คำนวณค่าพลังงานรวม (Logic เดิมของคุณ)
  Object.values(selectedMeals).forEach(f => {
    const kcal = f.kcal ?? f.calories ?? 0;
    totalCal += kcal;
    totalP += f.protein || 0;
    totalC += f.carbs || 0;
    totalF += f.fat || 0;
  });

  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!user) return;

  // 2. อัปเดตตัวเลขและกราฟ (Logic เดิมของคุณ)
  animateValue('dash-cal-val', 0, totalCal, 1000);
  // ตรวจสอบว่า ID เหล่านี้มีใน HTML หรือไม่ ถ้าไม่มีให้ใส่เครื่องหมาย ? กัน Error
  if (document.getElementById('dash-protein')) animateValue('dash-protein', 0, totalP, 1000);
  if (document.getElementById('dash-carbs')) animateValue('dash-carbs', 0, totalC, 1000);
  if (document.getElementById('dash-fat')) animateValue('dash-fat', 0, totalF, 1000);

  updateMacroBar("bar-protein", totalP, user.protein);
  updateMacroBar("bar-carbs", totalC, user.carbs);
  updateMacroBar("bar-fat", totalF, user.fat);
  updateCircleGraph(totalCal, user.tdee);

  // 3. แสดงรายการอาหารเป็นการ์ด (ส่วนที่เพิ่มใหม่ ✨)
  const mealListContainer = document.getElementById("dashboard-meal-list");
  if (mealListContainer) {
    const mealsArray = Object.values(selectedMeals);

    if (mealsArray.length === 0) {
      mealListContainer.innerHTML = `<p style="color:#9CA3AF; padding:20px; text-align:center; grid-column: 1/-1;">ยังไม่มีรายการอาหารที่บันทึกวันนี้</p>`;
    } else {
      mealListContainer.innerHTML = mealsArray.map((f, index) => `
        <div class="meal-card">
          <img src="${f.image || 'https://via.placeholder.com/80?text=Food'}" class="meal-img" alt="${f.name}">
          <div class="meal-info">
            <div class="meal-name">${f.name}</div>
            <div class="meal-meta">
              ${f.kcal || f.calories || 0} kcal | P:${f.protein || 0} C:${f.carbs || 0} F:${f.fat || 0}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // 4. บันทึกลง Daily Log (Logic เดิมของคุณ)
  const key = getTodayKey();
  const dailyLog = getDailyLog();

  if (!dailyLog[key]) {
    dailyLog[key] = {
      workouts: [],
      nutrition: null
    };
  }

  dailyLog[key].nutrition = {
    calories: totalCal,
    protein: totalP,
    carbs: totalC,
    fat: totalF
  };
  saveDailyLog(dailyLog);
}

function saveWorkoutToToday(workout) {
  const today = new Date().toISOString().split("T")[0];
  const key = "fit_workout_log_guest";

  const data = JSON.parse(localStorage.getItem(key)) || [];

  if (!data[today]) {
    data[today] = [];
  }
  data[today].push(workout);
  localStorage.setItem(key, JSON.stringify(data));
}

function mapProgramWorkoutsToCards(workouts) {
  const seen = new Set();

  return workouts
    .map(w => {
      const workout = w.gymWorkout ?? w.homeWorkout;

      if (!workout) return null;

      // กันซ้ำด้วย id ของ workout จริง
      if (seen.has(workout.id)) return null;
      seen.add(workout.id);

      return {
        id: workout.id,
        title: workout.nameTh || workout.nameEn || "ไม่มีชื่อ",
        img: workout.imageUrl?.replace("[URL] ", "") || "",
        sub: w.repsInfo || "",
        instruction: workout.description || "",
        sets: extractSets(w.repsInfo),
        repsGuide: extractReps(w.repsInfo)
      };
    })
    .filter(Boolean);

  return Object.values(grouped).map(group => group[0]);
}

function extractSets(text) {
  if (!text) return 1;
  const match = text.match(/x\s*(\d+)/);
  return match ? Number(match[1]) : 1;
}

function extractReps(text) {
  if (!text) return "";
  const match = text.match(/^(\d+)/);
  return match ? match[1] + " ครั้ง" : text;
}

function getProgramId() {
  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!user) return "PG01";

  const goal = user.goal;
  const level = user.level;

  if (goal === "lose-fat") {
    if (level === "medium" || level === "hard") return "PG02";
    return "PG01";
  }
  if (goal === "build-muscle") {
    if (level === "hard") return "PG05";
    if (level === "medium") return "PG03";
    return "PG04";
  }
  return "PG01"; // default
}

async function loadTodayWorkout() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/today-workout`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const container = document.getElementById("dashboard-workout-list");
    const headerEl = document.querySelector(".workout-progress-text");

    if (!res.ok) {
      if (headerEl) headerEl.innerHTML = `<span style="color: white;">เกิดข้อผิดพลาดในการเชื่อมต่อ</span>`;
      return;
    }

    const data = await res.json();
    if (data.noProgram || data.programDone) return;

    // คำนวณวันที่ 1/30, 60, 90 สำหรับ Banner 
    let dayProgressText = "";
    const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
    
    if (user && user.startDate) {
        const start = new Date(user.startDate);
        const today = new Date();
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today - start;
        const dayDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const duration = user.duration || 30;

        if (dayDiff > 0 && dayDiff <= duration) {
            dayProgressText = `วันที่ ${dayDiff}/${duration} • `;
        } else if (dayDiff > duration) {
            dayProgressText = `จบโปรแกรมแล้ว • `;
        } else {
            dayProgressText = `เริ่มแผนใหม่พรุ่งนี้ • `;
        }
    }

    // ดึงข้อมูลท่าออกกำลังกายของวันนี้
    const todayKey = getTodayKey();
    completedWorkouts = workoutHistory
      .filter(item => (item.date ? item.date.slice(0, 10) : "") === todayKey)
      .map(item => item.exerciseId);

    window.todayWorkout = data.exercises.map(ex => ({
      id: ex.id,
      title: ex.nameTh,
      img: ex.imageUrl?.replace('[URL]', '').trim() || '',
      sub: data.isTime ? `${data.reps} x ${data.sets} รอบ` : `${data.reps} ครั้ง x ${data.sets} เซ็ต`,
      instruction: ex.description,
      sets: data.sets,
      reps: data.reps
    }));

    // ✅ อัปเดต Banner สถานะการทำโปรแกรม + ความคืบหน้า
    if (headerEl) {
        const doneCount = completedWorkouts.length;
        const totalCount = window.todayWorkout.length;
        headerEl.innerHTML = `<strong>${dayProgressText}</strong>เป้าหมายวันนี้ • ทำแล้ว ${doneCount}/${totalCount} ท่า`;
    }

    renderWorkoutCards("dashboard-workout-list", window.todayWorkout);
    updateWorkoutProgressBar();

  } catch (err) {
    console.error(err);
  }
}

function navigateTo(pageId) {
  document.querySelectorAll('.page')
    .forEach(page => page.classList.remove('active'));

  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add('active');

  if (pageId === "dashboard") {
    loadTodayWorkout();
  }
  if (pageId === "profile") {
    loadProfilePage();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadTodayWorkout();
  loadTodayMeals();
});

async function loadTodayMeals() {

  const token = localStorage.getItem("token");

  if (!token) {
    updateDashboardNutrition();
    renderDashboardMeals();
    return;
  }

  try {

    const res = await fetch(`${API_BASE}/api/log-meal/today`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      updateDashboardNutrition();
      renderDashboardMeals();
      return;
    }

    const meals = await res.json();

    console.log("Today's meals from API:", meals);

    // 🔥 สำคัญมาก
    selectedMeals = {};

    meals.forEach(m => {
      selectedMeals[m.mealType] = {
        id: m.food.id,
        name: m.food.nameTh,
        kcal: m.food.calories,
        protein: m.food.protein,
        carbs: m.food.carbs,
        fat: m.food.fat,
        img: m.food.imageUrl || m.food.imageurl
      };
    });

    console.log("Mapped selectedMeals:", selectedMeals);

    updateDashboardNutrition();
    renderDashboardMeals();

  } catch (err) {
    console.error(err);
    updateDashboardNutrition();
  }
}

async function loadWorkoutHistory() {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE}/api/workout-history`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      console.error("Workout history error:", res.status);
      return;
    }

    const data = await res.json();

    const tbody = document.querySelector('#workout-history-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#9CA3AF;">ยังไม่มีประวัติการออกกำลังกาย</td></tr>';
      return;
    }

    data.forEach(item => {
      const row = document.createElement('tr');

      const dateStr = new Date(item.date).toLocaleDateString('th-TH');
      const name = item.exercise?.nameTh || item.note || '-';
      // sets/reps อาจเป็น string หรือ number จาก DB
      const setsVal = item.sets != null ? parseInt(item.sets) : null;
      const repsVal = item.reps != null ? parseInt(item.reps) : null;
      const durVal = item.duration != null ? parseInt(item.duration) : null;
      const setsStr = setsVal ? `${setsVal} เซ็ต` : '-';
      const repsStr = durVal ? `${durVal} วินาที` : repsVal ? `${repsVal} ครั้ง` : '-';

      row.innerHTML = `
        <td>${dateStr}</td>
        <td>${name}</td>
        <td>${setsStr}</td>
        <td>${repsStr}</td>
      `;

      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Error loading workout history:", err);
  }
}

async function loadMealHistory() {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE}/api/meal-history`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      console.error("Meal history error:", res.status);
      return;
    }

    const data = await res.json();

    const tbody = document.querySelector('#meal-history-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(item => {
      const food = item.food || {};

      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${new Date(item.date).toLocaleDateString()}</td>
        <td>${item.mealType || '-'}</td>
        <td>${food.nameTh || '-'}</td>
        <td>${food.calories || '-'}</td>
        <td>${food.protein || '-'}</td>
        <td>${food.carbs || '-'}</td>
        <td>${food.fat || '-'}</td>
      `;

      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Error loading meal history:", err);
  }
}

async function loadProfileFromServer() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/profile`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return;

    const profile = await res.json();

    // ถ้ามีข้อมูลใน server ให้ sync ลง localStorage
    if (profile && profile.name) {
      localStorage.setItem(ukey("fit_user"), JSON.stringify({
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        weight: profile.weight,
        height: profile.height,
        goal: profile.goal,
        focus: profile.focus,
        level: profile.level,
        tdee: profile.tdee,
        protein: profile.protein,
        carbs: profile.carbs,
        fat: profile.fat,
        bmi: profile.bmi,
        bmiStatus: profile.bmi < 18.5 ? "ผอม" : profile.bmi < 23 ? "ปกติ" : profile.bmi < 25 ? "ท้วม" : "อ้วน"
      }));
      loadUserData();
    }
  } catch (err) {
    console.error("Failed to load profile from server:", err);
  }
}

async function loadExercisesFromAPI() {
  try {
    const res = await fetch(`${API_BASE}/api/exercises`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    window.workoutData = data.map(ex => ({
      id: ex.id,
      title: ex.nameEn || ex.nameTh || "Workout",
      sub: (ex.bodyPart || "") + " • " + (ex.level || ""),
      img: ex.imageUrl?.replace('[URL]', '').trim() || "",
      instruction: ex.instruction || ex.description || "ไม่มีคำแนะนำสำหรับท่านี้",
      sets: ex.sets || 0,
      repsGuide: ex.repsGuide || ""
    }));

    // 1. วาดการ์ดลงหน้าคลัง (Arena)
    renderWorkoutCards("workout-list", window.workoutData);

    // 2. ดักจับการคลิกในหน้าคลังเพื่อให้เป็นโหมด "view" (ไม่มีปุ่มจบวันนี้)
    const container = document.getElementById("workout-list");
    if (container) {
      container.querySelectorAll(".workout-card").forEach(card => {
        card.addEventListener("click", (e) => {
          const id = card.dataset.id;
          const item = window.workoutData.find(i => String(i.id) === String(id));
          if (item) {
            openWorkoutModal(item, "view");
          }
        });
      });
    }
  } catch (err) {
    console.error("Failed to load exercises:", err);
  }
}

// ฟังก์ชันสำหรับปิด Modal (ปุ่ม x และ ปุ่มปิดหน้าต่าง)
window.closeTimerModal = function () {
  const modal = document.getElementById('timer-modal');
  if (modal) {
    modal.style.display = 'none';
  }

  // ✅ รีเซ็ตสถานะปุ่มและแถบสีแดงให้กลับมาโชว์ปกติ สำหรับรอบหน้าที่เปิดจาก Dashboard
  const finishBtn = document.getElementById("finish-workout-btn");
  const planEl = document.getElementById('modal-plan-text');

  if (finishBtn) {
    finishBtn.style.display = "block";
    finishBtn.disabled = false;
  }
  if (planEl) {
    planEl.style.display = "block";
  }

  // รีเซ็ตค่าชั่วคราว
  activeTitle = null;
  activeMode = "do";
};

function attachFoodLibraryEvents() {
  const container = document.getElementById("food-library-list");
  if (!container) return;

  // หาเฉพาะ .food-card (ไม่รวม category header)
  container.querySelectorAll(".food-card").forEach(card => {
    card.onclick = function () {
      const idx = this.getAttribute('data-index'); // ✅ ดึง index จาก attribute
      const food = foodLibrary[idx];

      if (food) {
        openDashMealDetail({
          title: food.name,
          kcal: food.kcal,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          img: food.img,
          meal: "ข้อมูลอาหารในคลัง"
        });
      }
    };
  });
}

// ✅ ฟังก์ชันสำหรับ "ดูข้อมูลอย่างเดียว" ในหน้าคลังอาหาร (ห้ามสับสนกับหน้า Dashboard)
window.viewFoodDetailOnlyFromLibrary = function (index) {
  const food = foodLibrary[index];
  if (!food) {
    console.error("ไม่พบข้อมูลอาหารที่ index:", index);
    return;
  }

  // เรียกใช้ Popup "รายละเอียด" (โชว์กราฟสารอาหารเฉยๆ)
  if (typeof openDashMealDetail === 'function') {
    openDashMealDetail({
      title: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      img: food.img,
      meal: "ข้อมูลทางโภชนาการ"
    });
  } else {
    showToast("⚠️ ไม่พบฟังก์ชันเปิด Popup", "warning");
  }
};

// ✅ ฟังก์ชันสำหรับ "ดูข้อมูลโภชนาการ" ในหน้าคลังอาหาร
window.viewFoodDetailOnly = function (index) {
  // ตรวจสอบข้อมูลอาหารจาก Array หลัก
  const food = foodLibrary[index];

  if (!food) {
    console.error("ไม่พบข้อมูลอาหารที่ลำดับนี้:", index);
    return;
  }

  // เรียกใช้ Popup รายละเอียด (openDashMealDetail) 
  // ซึ่งจะแสดงกราฟวงกลมและตัวเลขสารอาหารที่สะอาดตา
  if (typeof openDashMealDetail === 'function') {
    openDashMealDetail({
      title: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      img: food.img,
      meal: "ข้อมูลโภชนาการ"
    });
  } else {
    showToast("⚠️ ระบบ Popup รายละเอียดขัดข้อง", "warning");
  }
};

// ✅ ฟังก์ชันนี้จะทำงานเมื่อกดที่รูปอาหารในหน้าคลัง
window.handleFoodClick = function (index) {
  //console.log("จิ้มอาหารลำดับที่:", index); // เช็คใน Console ว่าข้อความนี้ขึ้นไหม

  const food = foodLibrary[index];
  if (!food) return;

  // ตรวจสอบชื่อฟังก์ชันเปิด Popup ของคุณ (ต้องตรงกับใน Dashboard)
  if (typeof openDashMealDetail === 'function') {
    openDashMealDetail({
      title: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      img: food.img,
      meal: "ข้อมูลโภชนาการ"
    });
  } else {
    alert("หาฟังก์ชัน openDashMealDetail ไม่เจอ กรุณาเช็คชื่อฟังก์ชันเปิด Popup อีกครั้งครับ");
  }
};

// สร้างฟังก์ชันทิ้งไว้เพื่อป้องกัน Error "ensureAudio is not defined"
function ensureAudio() {
    // ไม่ต้องใส่โค้ดอะไรข้างในก็ได้ครับ แค่มีชื่อฟังก์ชันไว้ให้ระบบเรียกหาเจอพอ
    console.log("Audio system bypassed (Function placeholder)");
    return Promise.resolve();
}