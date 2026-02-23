/* =========================================
   const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    เว็บdeploy
    : "https://fitlife-dlfz.onrender.com";
   ========================================= */

// ===== Auth/User scope =====
const __session = (window.Auth && Auth.getSession) ? Auth.getSession() : null;
const __user = (window.Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
const __userId = (__user && __user.id) ? __user.id : "guest";
const ukey = (k) => `${k}_${__userId}`;
const API_BASE = "http://localhost:3000";


window.navigateTo = function (pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-page') === pageId) btn.classList.add('active');
  });
};

let currentStep = 1;
const totalSteps = 3;

let waterIntake = 750;
const waterGoal = 2000;

// ============================
// Global Data Store
// ============================

let workoutData = [];
let foodLibrary = [];
let programSchedule = [];
window.todayWorkout = [];

// ถ้า session หมดอายุ ให้เด้งกลับไปหน้า Login
if (window.Auth && !__session) {
  window.location.replace("login_new.html");
}

/* =========================================
   1. WORKOUT 
   ========================================= */
async function loadExercisesFromAPI() {
  try {
    const res = await fetch(`${API_BASE}/api/exercises`);
    const data = await res.json();

    window.workoutData = data.map(ex => ({
      id: ex.id,
      title: ex.nameEn,
      sub: ex.bodyPart + " • " + ex.level,
      img: ex.imageUrl?.replace('[URL]', '').trim(),
      instruction: ex.instruction,
      sets: ex.sets,
      repsGuide: ex.repsGuide,
      defaultReps: ex.defaultReps
    }));

    console.log("workoutData =", window.workoutData);

    renderWorkoutCards("workout-list", window.workoutData);

  } catch (err) {
    console.error("Failed to load exercises:", err);
  }
}



function getDifficultyClass(text) {
  if (text.toLowerCase().includes("easy")) return "beginner";
  if (text.toLowerCase().includes("medium")) return "intermediate";
  if (text.toLowerCase().includes("hard")) return "advanced";
  return "beginner";
}

function renderFoodLibrary() {
  const el = document.getElementById("food-library-list");
  if (!el) return;

  if (!Array.isArray(foodLibrary) || foodLibrary.length === 0) {
    el.innerHTML = "<p>ยังไม่มีข้อมูลอาหาร</p>";
    return;
  }

  el.innerHTML = `
    <div class="food-grid">
      ${foodLibrary.map(x => `
        <div class="food-card">
          <img src="${x.img || ''}" alt="${x.name}">
          <div class="food-card-body">
            <h3>${x.name}</h3>
            <p>${x.kcal} kcal</p>
            <small>P:${x.protein} • C:${x.carbs} • F:${x.fat}</small>
          </div>
        </div>
      `).join("")}
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
const renderMeal = (meal, containerId, sumId) => {
  const el = document.getElementById(containerId);
  const sumEl = document.getElementById(sumId);
  if (!el) return;

  const list = day[meal] || [];
  const t = calcMealTotals(list);
  if (sumEl) sumEl.innerText = `${t.cal} kcal`;

  // events (open detail / delete)
  el.querySelectorAll(".food-item").forEach(row => {
    const del = row.querySelector(".food-delete");
    const meal2 = row.dataset.meal;
    const idx2 = Number(row.dataset.idx);

    row.addEventListener("click", (e) => {
      if (e.target === del) return; // let delete handler do it
      openFoodDetail(meal2, idx2);
    });

    if (del) {
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFoodItem(meal2, idx2);
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

    obj.innerHTML = currentVal.toLocaleString();

    const noUnitIDs = [
      'dash-cal-val', 'dash-weight', 'dash-height', 'dash-bmi',
      'bmi-val', 'dash-cal-target', 'water-count'
    ];
    if (!noUnitIDs.includes(id)) {
      obj.innerHTML += '<small style="font-size:0.6em; margin-left:2px; color:#888;">g</small>';
    }

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

  el.innerHTML = items.map(item => `
    <div class="workout-card" data-id="${item.id}">
      <div class="workout-img">
        <img src="${item.img}" alt="${item.title}">
        <span class="difficulty-badge beginner">
          ${item.sub}
        </span>
      </div>
      <div class="workout-content">
        <h3>${item.title}</h3>
        <p>${item.sub}</p>
      </div>
    </div>
  `).join("");

  el.querySelectorAll(".workout-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const item = items.find(i => i.id == id);
      if (item) openWorkoutModal(item, "do");
    });
  });
}



// [Sound System]
let audioCtx = null;
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return true;
  } catch (e) {
    console.warn("AudioContext ใช้ไม่ได้:", e);
    return false;
  }
}

function playSound(type) {
  if (!ensureAudio()) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'beep') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'finish') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
  }
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
let workoutHistory = JSON.parse(localStorage.getItem(ukey("fit_workout_history"))) || {};

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
  activeSetIndex = 0;
  activeMode = mode;
  activeImgUrl = item.img || "";

  setText('modal-title', item.title);
  setText(
    'instruction-text',
    `${item.instruction} (แนะนำ ${item.sets} เซ็ต • ${item.repsGuide})`
  );

  const planEl = document.getElementById('modal-plan-text');
  if (planEl) {
    planEl.innerText =
      item.sets > 1
        ? `${item.repsGuide} x ${item.sets} เซ็ต`
        : `${item.repsGuide}`;
  }

  const imgEl = document.getElementById('modal-image');
  if (imgEl) {
    if (item.img) {
      imgEl.src = item.img;
      imgEl.style.display = "";
    } else {
      imgEl.style.display = "none";
    }
  }

  setText('set-target', item.sets);
  setText('set-current', 1);

  const finishBtn = document.getElementById("finish-workout-btn");

if (finishBtn) {
    finishBtn.onclick = async () => {

        console.log("BUTTON CLICKED");

        if (!activeTitle) return;

        const today = getTodayKey();

        try {
            await fetch("http://localhost:3000/api/workout-log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    date: today,
                    title: activeTitle
                })
            });

            console.log("FETCH SENT");
            showToast("บันทึกเรียบร้อย 💪", "success");
            closeTimerModal();

        } catch (err) {
            console.error(err);
        }
    };
}

  if (mode === "view") {
    
    if (finishBtn) {
      finishBtn.style.display = "";
      finishBtn.innerText = "จบวันนี้";
      finishBtn.style.background = "#333";
    }
  }

  const timerModal = document.getElementById("timer-modal");
  if (timerModal) {
    timerModal.style.display = "flex";
  }
  playSound('beep');

  if (mode === "view") {
    showToast(`📖 ดูคำแนะนำ: ${item.title}!`, 'info');
  } else {
    showToast(`🏋️ เริ่มท่า ${item.title}!`, 'info');
  }
}

window.closeTimerModal = function () {
  const timerModal = document.getElementById('timer-modal');
  if (timerModal) timerModal.style.display = 'none';
  activeTitle = null;
  activeSetIndex = 0;
  activeMode = "do"; // รีเซ็ต mode
  activeImgUrl = "";
  const imgEl = document.getElementById("modal-image");
  if (imgEl) { imgEl.removeAttribute("src"); imgEl.style.display = "none"; }
};


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

function markTodayAsDone() {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (workoutHistory[key] !== 'done') {
    workoutHistory[key] = 'done';
    localStorage.setItem(ukey("fit_workout_history"), JSON.stringify(workoutHistory));

    renderWeeklyStreak();
    if (document.getElementById('full-calendar-modal')?.style.display === 'flex') renderFullCalendar();
    updateStreakDisplay();

    showToast("✅ บันทึกการฝึกสำเร็จ!", "success");
  }
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
    if (workoutHistory[key] === 'done') card.classList.add('done');
    else if (i < 0) card.classList.add('missed');

    card.innerHTML = `<span class="day-name">${days[d.getDay()]}</span><span class="day-num">${d.getDate()}</span><div class="status-dot"></div>`;
    wrapper.appendChild(card);
  }
}

function updateStreakDisplay() {
  let streak = 0;
  const getKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const d = new Date();
  if (workoutHistory[getKey(d)] === 'done') streak++;

  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);

  while (workoutHistory[getKey(checkDate)] === 'done') {
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
  } catch (err) {
    console.error(err);
  }
}


/* =========================================
   7. DOM CONTENT LOADED (ปรับปรุงแล้ว)
   ========================================= */
document.addEventListener("DOMContentLoaded", async () => {

  await loadFoodLibrary();
  await loadExercisesFromAPI();

  loadUserData();
  updateDashboardFromProfile();
  renderDashboardMeals();
  updateDashboardNutrition();


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
    dashboardPage.addEventListener('click', (e) => {
      const card = e.target.closest('.workout-card');
      if (card) {
        const titleElem = card.querySelector('.workout-content h3');
        if (!titleElem) return;

        const title = titleElem.innerText.trim();
        const item = window.workoutData.find(w => w.title === title);

        if (item) {
          openWorkoutModal(item, "do");
        } else {
          showToast(`ไม่พบข้อมูลท่า "${title}"`, "warning");
        }

        return;
      }

      const wpItem = e.target.closest('.wp-item');
      if (wpItem) {
        const titleElem = wpItem.querySelector('.wp-info strong');
        if (!titleElem) return;

        const title = titleElem.innerText.trim();
        if (workoutDB[title]) {
          openWorkoutModal(title, "do");
        }
      }
    });

    console.log('✅ Dashboard Event Delegation ติดตั้งแล้ว');
  }

  // Workout Arena - โหมดดูเฉยๆ
  const arenaPage = document.getElementById('exercise');
  if (arenaPage) {

    arenaPage.addEventListener('click', (e) => {
      const listItem = e.target.closest('.list-item[data-workout]');
      if (listItem) {
        const workoutTitle = listItem.dataset.workout;

        if (workoutTitle && workoutDB[workoutTitle]) {
          openWorkoutModal(workoutTitle, "view");
        } else {
          showToast(`ไม่พบข้อมูลท่า "${workoutTitle}"`, 'warning');
        }
        return;
      }

      const card = e.target.closest('.workout-card, .arena-card, [data-workout]');
      if (card) {
        let title = card.dataset.workout || card.dataset.title;

        if (!title) {
          const titleElem = card.querySelector('h3, .workout-title, .title, strong');
          if (titleElem) title = titleElem.innerText.trim();
        }

        if (title && workoutDB[title]) {
          const img = card.querySelector("img");
          const imgUrl = img && img.getAttribute("src") ? img.getAttribute("src") : "";
          openWorkoutModal(title, "view", imgUrl);
        }
      }
    });

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
        else if (workoutHistory[key] === 'done') cell.classList.add('done');
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

    if (workoutHistory[checkKey] === 'done') className += ' workout-done';
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

  setText('wizard-title', `Step ${n}: ${["ข้อมูลพื้นฐาน", "เป้าหมาย", "ระดับ"][n - 1]}`);

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const finishBtn = document.getElementById('finish-btn');

  if (prevBtn) prevBtn.disabled = (n === 1);
  if (nextBtn) nextBtn.style.display = (n === totalSteps) ? 'none' : 'inline-block';
  if (finishBtn) finishBtn.style.display = (n === totalSteps) ? 'inline-block' : 'none';
}

function selectOption(elem, type, value) {
  [...elem.parentElement.children].forEach(c => c.classList.remove('selected'));
  elem.classList.add('selected');
  const input = document.getElementById('selected-' + type);
  if (input) input.value = value;
}

function updateLevelText(val) {
  const map = { "1": "ง่าย", "2": "ปานกลาง", "3": "ยาก" };
  const el = document.getElementById("level-text");
  if (el) el.innerText = map[String(val)] || "ง่าย";
}

function finishWizard() {
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
  const level = document.getElementById("selected-level")?.value || "medium";

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
    bmiStatus
  }));

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

  updateCircleGraph(0, tdee);
  updateMacroBar("bar-protein", 0, user.protein);
  updateMacroBar("bar-carbs", 0, user.carbs);
  updateMacroBar("bar-fat", 0, user.fat);

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


  // ===== Food (Nutrition Hub) =====

  const todayKey = getTodayKey();


  let totalCal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;



  const tdee = data.tdee;
  setText('dash-cal-target', `เป้าหมาย ${tdee.toLocaleString()}`);

  const pGoal = Math.round((tdee * 0.3) / 4);
  const cGoal = Math.round((tdee * 0.45) / 4);
  const fGoal = Math.round((tdee * 0.25) / 9);

  animateValue('dash-protein', 0, totalP, 1500);
  animateValue('dash-carbs', 0, totalC, 1500);
  animateValue('dash-fat', 0, totalF, 1500);
  animateValue('dash-cal-val', 0, totalCal, 1500);

  updateMacroBar('bar-protein', totalP, pGoal);
  updateMacroBar('bar-carbs', totalC, cGoal);
  updateMacroBar('bar-fat', totalF, fGoal);
  updateCircleGraph(totalCal, tdee);

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
function saveProfile() {
  const goal = document.getElementById('goalSelect')?.value;
  const activity = document.getElementById('activitySelect')?.value;

  const btn = document.querySelector('.btn-save-profile');
  if (!btn) return;

  const originalText = btn.innerText;
  btn.innerText = "กำลังบันทึก...";
  btn.style.opacity = "0.7";

  setTimeout(() => {
    btn.innerText = "บันทึกเรียบร้อย! ✅";
    btn.style.background = "#059669";
    btn.style.opacity = "1";

    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = "linear-gradient(to right, #10B981, #059669)";
    }, 2000);

    console.log("Saved Goal:", goal, "Activity:", activity);
  }, 800);
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
function openDashMealDetail(data) {
  const modal = document.getElementById('dash-meal-modal');
  if (!modal) return;

  const titleEl = document.getElementById('dash-meal-title');
  const subEl = document.getElementById('dash-meal-sub');
  const imgEl = document.getElementById('dash-meal-img');

  const kcalEl = document.getElementById('dash-kcal');
  const pEl = document.getElementById('dash-p');
  const cEl = document.getElementById('dash-c');
  const fEl = document.getElementById('dash-f');

  titleEl.textContent = data?.title || 'รายละเอียดอาหาร';
  subEl.textContent = (data?.meal ? `${data.meal} • ` : '') + (data?.kcal != null ? `${data.kcal} kcal` : '');

  if (imgEl) {
    imgEl.src = data?.img || '';
    imgEl.style.display = data?.img ? 'block' : 'none';
  }

  if (kcalEl) kcalEl.textContent = `${data?.kcal ?? 0} kcal`;
  if (pEl) pEl.textContent = `${data?.protein ?? 0} g`;
  if (cEl) cEl.textContent = `${data?.carbs ?? 0} g`;
  if (fEl) fEl.textContent = `${data?.fat ?? 0} g`;

  modal.style.display = 'flex';
  // close when click backdrop
  modal.onclick = (e) => { if (e.target === modal) closeDashMealDetail(); };
}

function closeDashMealDetail() {
  const modal = document.getElementById('dash-meal-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

function generateMealPlan() {
  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!user || !foodLibrary.length) return null;

  const totalCal = user.tdee;

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
    const f = plan[meal];
    if (!f) return "";

    const isSaved = selectedMeals[meal];

    return `
        <div class="meal-dashboard-card ${isSaved ? "saved" : ""}" 
             data-meal="${meal}" 
             data-id="${f.id}">
             
              ${isSaved ? `<div class="saved-badge">✔</div>` : ""}

          <img src="${f.img}" class="meal-thumb">

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
      console.log("CARD CLICKED");

      const meal = card.dataset.meal;
      const id = card.dataset.id;

      console.log("DATA:", meal, id);

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

  document.getElementById("meal-popup").style.display = "flex";
}

function closeMealPopup() {
  document.getElementById("meal-popup").style.display = "none";
}

function confirmMeal() {

  if (!currentPopupMeal || !currentselectedFood) return;
  selectedMeals[currentPopupMeal] = currentselectedFood;

  localStorage.setItem(
    ukey("selected_meals"),
    JSON.stringify(selectedMeals)

  );

  updateDashboardNutrition();

  showToast("บันทึกเรียบร้อย ", "success")
  closeMealPopup();

}

function changeMeal() {
  const card = document.querySelector(".meal-popup-card");
  if (!card) return;

  if (card.querySelector(".popup-food-list")) return;

  const container = document.createElement("div");
  container.className = "popup-food-list";

  container.innerHTML = `
    <h4>เลือกเมนูใหม่</h4>
    <div class="popup-food-grid">
      ${foodLibrary.map(f => `
        <div class="popup-food-item" data-id="${f.id}">
          <img src="${f.img}">
          <div>
            <strong>${f.name}</strong>
            <small>${f.kcal} kcal</small>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  card.appendChild(container);

  container.querySelectorAll(".popup-food-item").forEach(item => {
    item.addEventListener("click", () => {

      const id = item.dataset.id;
      const food = foodLibrary.find(f => String(f.id) === String(id));
      if (!food) return;

      container.remove(); // ปิดคลัง
      openMealPopup(currentPopupMeal, food.id);
    });
  });
}

function updateDashboardNutrition() {

  let totalCal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  Object.values(selectedMeals).forEach(f => {
    totalCal += f.kcal;
    totalP += f.protein;
    totalC += f.carbs;
    totalF += f.fat;
  });

  const user = JSON.parse(localStorage.getItem(ukey("fit_user")));
  if (!user) return;

  animateValue('dash-cal-val', 0, totalCal, 1000);
  animateValue('dash-protein', 0, totalP, 1000);
  animateValue('dash-carbs', 0, totalC, 1000);
  animateValue('dash-fat', 0, totalF, 1000);

  updateMacroBar("bar-protein", totalP, user.protein);
  updateMacroBar("bar-carbs", totalC, user.carbs);
  updateMacroBar("bar-fat", totalF, user.fat);
  updateCircleGraph(totalCal, user.tdee);
}

function saveWorkoutToToday(workout) {
  const today = new Date().toISOString().split("T")[0];
  const key = "fit_workout_log_guest";

  const data = JSON.parse(localStorage.getItem(key)) || {};

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

async function loadProgramDay(programId, dayNumber) {

  try {
    const res = await fetch(
      `${API_BASE}/api/programs/${programId}/days/${dayNumber}`
    );

    const data = await res.json();

    if (!data.workouts) {
      console.error("No workouts found");
      return;
    }

    // 🔹 แสดงหัววัน
    if (data.dayInfo) {
      document.getElementById("day-title").innerText =
        data.dayInfo.day_title;

      document.getElementById("day-description").innerText =
        data.dayInfo.description;
    }

    const mapped = mapProgramWorkoutsToCards(data.workouts);
    window.todayWorkout = mapped;
    renderWorkoutCards("dashboard-workout-list", mapped);

  } catch (error) {
    console.error("Failed to load program day", error);
  }
}

function navigateTo(pageId) {
  document.querySelectorAll('.page')
    .forEach(page => page.classList.remove('active'));

  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add('active');

  // 👇 เพิ่มตรงนี้
  if (pageId === "dashboard") {
    loadProgramDay("PG01", 1);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadProgramDay("PG01", 1);
});

