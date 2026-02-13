/* =========================================
   FitLife Easy - FIXED & OPTIMIZED VERSION
   แก้ไข: 
   - รวม event listeners ไม่ให้ซ้ำซ้อน
   - เพิ่ม null checks ป้องกัน error
   - ปรับปรุง modal mode logic
   - เพิ่ม data validation
   ========================================= */

// ===== Auth/User scope =====
const __session = (window.Auth && Auth.getSession) ? Auth.getSession() : null;
const __user = (window.Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
const __userId = (__user && __user.id) ? __user.id : "guest";
const ukey = (k) => `${k}_${__userId}`;

// ถ้า session หมดอายุ ให้เด้งกลับไปหน้า Login
if (window.Auth && !__session) {
  window.location.replace("login_new.html");
}

/* =========================================
   1. WORKOUT & MEAL DATA (รวมจากทั้งสองไฟล์)
   ========================================= */
const workoutData = [
  { id: "chair_squat", title: "สควอทบนนเก้าอี้", sub: "15 ครั้ง x 3 เซ็ต", img: "https://images.unsplash.com/photo-1574680096141-1cddd32e04ca?w=200&auto=format&fit=crop", modalName: "Squat" },
  { id: "wall_push", title: "วิดพื้นกับกำแพง", sub: "15 ครั้ง x 3 เซ็ต", img: "https://images.unsplash.com/photo-1598971639058-211a74a96aea?w=200&auto=format&fit=crop", modalName: "Push-up" },
  { id: "door_row", title: "ยืนดึงขอบประตู", sub: "15 ครั้ง x 3 เซ็ต", img: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&auto=format&fit=crop", modalName: "Row" },
  { id: "knee_push", title: "วิดพื้นยกกัน (งอเข่า)", sub: "15 ครั้ง x 3 เซ็ต", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&auto=format&fit=crop", modalName: "Knee Push-up" },
  { id: "plank", title: "แพลงก์", sub: "30 วินาที", img: "https://images.unsplash.com/photo-1518611012118-f0c5d9d7d65b?w=200&auto=format&fit=crop", modalName: "Plank" },
  { id: "fast_walk", title: "เดินเร็ว", sub: "30 นาที", img: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200&auto=format&fit=crop", modalName: "Walk" },
];

// เติมรูปให้การ์ดใน Workout Arena (ถ้า <img src> ว่าง)
function hydrateArenaImages() {
  const arena = document.getElementById('exercise');
  if (!arena) return;

  const map = new Map(workoutData.map(w => [w.title.trim().toLowerCase(), w.img]));
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

const mealData = [
  { id: "salad", title: "🥗 โปรตีนสลัด + ผักสด", sub: "มื้อกลางวัน • 450 kcal", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop" },
  { id: "oat", title: "🍳 คาร์โบวลีน", sub: "มื้อเช้า • 320 kcal", img: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=200&auto=format&fit=crop" },
  { id: "fish", title: "🐟 ปลา + ผักโบรคโคลี่", sub: "มื้อเย็น • 380 kcal", img: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?w=200&auto=format&fit=crop" },
];


/* =========================================
   1.1 NUTRITION HUB (Food Library + Daily Log)
   - แยกหมวด Breakfast/Lunch/Dinner
   - เพิ่มเมนูเองได้
   - กดการ์ดดูสารอาหาร (P/C/F) + ลบรายการ
   ========================================= */

const FOOD_MEALS = ["breakfast", "lunch", "dinner"];
const FOOD_MEAL_LABEL = {
  breakfast: "🍳 Breakfast",
  lunch: "🥪 Lunch",
  dinner: "🌙 Dinner",
};

const foodLibrary = [
  { id: "coffee_black", name: "กาแฟดำ (ไม่หวาน)", cal: 15, p: 0, c: 3, f: 0, img: "https://images.unsplash.com/photo-1459755486867-b55449bb39ff?w=500&auto=format&fit=crop" },
  { id: "boiled_egg", name: "ไข่ต้ม (1 ฟอง)", cal: 75, p: 7, c: 1, f: 5, img: "https://images.unsplash.com/photo-1551892374-ecf8754cf8f0?w=500&auto=format&fit=crop" },
  { id: "greek_yogurt", name: "กรีกโยเกิร์ต + เบอร์รี่", cal: 150, p: 12, c: 15, f: 4, img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop" },
  { id: "oatmeal", name: "ข้าวโอ๊ต + นม", cal: 320, p: 14, c: 52, f: 8, img: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=500&auto=format&fit=crop" },
  { id: "banana", name: "กล้วยหอม (1 ลูก)", cal: 105, p: 1, c: 27, f: 0, img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop" },

  { id: "tuna_sandwich", name: "แซนด์วิชทูน่าโฮลวีต", cal: 280, p: 18, c: 30, f: 10, img: "https://images.unsplash.com/photo-1550317138-10000687a72b?w=500&auto=format&fit=crop" },
  { id: "chicken_salad", name: "สลัดอกไก่", cal: 350, p: 32, c: 20, f: 12, img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop" },
  { id: "rice_basil_chicken", name: "ข้าวกะเพราไก่ไข่ดาว", cal: 550, p: 35, c: 65, f: 18, img: "https://images.unsplash.com/photo-1604908176997-125f25cc500b?w=500&auto=format&fit=crop" },
  { id: "sukiyaki_chicken", name: "สุกี้น้ำอกไก่", cal: 320, p: 30, c: 40, f: 5, img: "https://images.unsplash.com/photo-1604908554119-26c2b2b2991e?w=500&auto=format&fit=crop" },
  { id: "somtam_chicken", name: "ส้มตำ + ไก่ย่าง", cal: 420, p: 28, c: 45, f: 15, img: "https://images.unsplash.com/photo-1625937325382-2b8c9f264f3c?w=500&auto=format&fit=crop" },

  { id: "salmon_broccoli", name: "ปลาแซลมอน + บรอกโคลี", cal: 380, p: 32, c: 12, f: 20, img: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?w=500&auto=format&fit=crop" },
  { id: "grilled_fish", name: "ปลาย่าง + ผักนึ่ง", cal: 330, p: 28, c: 18, f: 12, img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop" },
  { id: "chicken_rice", name: "ข้าวมันไก่ (ธรรมดา)", cal: 620, p: 32, c: 78, f: 22, img: "https://images.unsplash.com/photo-1625938145974-6d9891e0b1c9?w=500&auto=format&fit=crop" },
  { id: "tomyum", name: "ต้มยำกุ้ง", cal: 200, p: 18, c: 10, f: 9, img: "https://images.unsplash.com/photo-1548940740-204726a19be3?w=500&auto=format&fit=crop" },
  { id: "stirfry_veg", name: "ผัดผักรวม", cal: 180, p: 6, c: 20, f: 8, img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop" },

  { id: "almonds", name: "อัลมอนด์อบ (10 เม็ด)", cal: 80, p: 3, c: 3, f: 7, img: "https://images.unsplash.com/photo-1505576391880-b3f9d713dc0c?w=500&auto=format&fit=crop" },
  { id: "apple", name: "แอปเปิล (1 ผล)", cal: 95, p: 0, c: 25, f: 0, img: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=500&auto=format&fit=crop" },
  { id: "guava", name: "ฝรั่ง (ครึ่งลูก)", cal: 60, p: 1, c: 14, f: 0, img: "https://images.unsplash.com/photo-1603046891796-1d0d64c1b94d?w=500&auto=format&fit=crop" },
  { id: "milk_lowfat", name: "นมจืดไขมันต่ำ (1 แก้ว)", cal: 120, p: 8, c: 12, f: 4, img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop" },
  { id: "protein_shake", name: "โปรตีนเชค (1 เสิร์ฟ)", cal: 180, p: 25, c: 8, f: 4, img: "https://images.unsplash.com/photo-1542444256-2913c3f6b77c?w=500&auto=format&fit=crop" },
];

const foodLogKey = ukey("fit_food_log"); // v2 structure (แยกมื้อ)
let __foodDetailCtx = null; // { meal, idx }

function getFoodLogRaw() {
  try { return JSON.parse(localStorage.getItem(foodLogKey) || "null"); }
  catch { return null; }
}

function normalizeFoodEntry(x) {
  return {
    name: String(x?.name || x?.title || "เมนู"),
    cal: Number(x?.cal ?? 0),
    p: Number(x?.p ?? 0),
    c: Number(x?.c ?? 0),
    f: Number(x?.f ?? 0),
    img: x?.img || "",
    ts: Number(x?.ts ?? Date.now()),
  };
}

// โครงสร้าง v2: { "YYYY-MM-DD": { breakfast:[], lunch:[], dinner:[] } }
function getFoodLog() {
  const raw = getFoodLogRaw();

  // ยังไม่เคยมี -> seed วันนี้ให้สวยๆ
  if (!raw) {
    const today = getTodayKey();
    const seeded = {
      [today]: {
        breakfast: [normalizeFoodEntry(foodLibrary.find(x => x.id === "oatmeal") || { name: "ข้าวโอ๊ต + นม", cal: 320, p: 14, c: 52, f: 8 })],
        lunch: [normalizeFoodEntry(foodLibrary.find(x => x.id === "chicken_salad") || { name: "สลัดอกไก่", cal: 350, p: 32, c: 20, f: 12 })],
        dinner: [normalizeFoodEntry(foodLibrary.find(x => x.id === "salmon_broccoli") || { name: "ปลาแซลมอน + บรอกโคลี", cal: 380, p: 32, c: 12, f: 20 })],
      }
    };
    localStorage.setItem(foodLogKey, JSON.stringify(seeded));
    return seeded;
  }

  // v1 (array) -> migrate ให้เป็น v2
  if (Array.isArray(raw)) {
    const today = getTodayKey();
    const migrated = { [today]: { breakfast: [], lunch: [], dinner: [] } };
    raw.forEach(item => {
      const meal = String(item?.meal || item?.mealType || '').toLowerCase();
      const targetMeal = (meal === 'breakfast' || meal === 'lunch' || meal === 'dinner') ? meal : 'lunch';
      migrated[today][targetMeal].push(normalizeFoodEntry(item));
    });
    localStorage.setItem(foodLogKey, JSON.stringify(migrated));
    return migrated;
  }

  // ensure day & meals exist
  const today = getTodayKey();
  if (!raw[today]) raw[today] = { breakfast: [], lunch: [], dinner: [] };
  FOOD_MEALS.forEach(m => { if (!Array.isArray(raw[today][m])) raw[today][m] = []; });
  return raw;
}

function saveFoodLog(obj) {
  localStorage.setItem(foodLogKey, JSON.stringify(obj));
}

function calcMealTotals(list) {
  return list.reduce((acc, x) => {
    acc.cal += (x.cal || 0);
    acc.p += (x.p || 0);
    acc.c += (x.c || 0);
    acc.f += (x.f || 0);
    return acc;
  }, { cal: 0, p: 0, c: 0, f: 0 });
}

function renderFoodPage() {
  const page = document.getElementById("food");
  if (!page) return;

  const log = getFoodLog();
  const today = getTodayKey();
  const day = log[today] || { breakfast: [], lunch: [], dinner: [] };

  // render each meal list
  const renderMeal = (meal, containerId, sumId) => {
    const el = document.getElementById(containerId);
    const sumEl = document.getElementById(sumId);
    if (!el) return;

    const list = day[meal] || [];
    const t = calcMealTotals(list);
    if (sumEl) sumEl.innerText = `${t.cal} kcal`;

    el.innerHTML = list.map((x, idx) => `
      <div class="food-item" data-meal="${meal}" data-idx="${idx}">
        <img src="${x.img || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop"}" alt="${x.name}">
        <div class="food-info">
          <div class="food-title">${x.name}</div>
          <div class="food-meta">${FOOD_MEAL_LABEL[meal]} • ${x.cal} kcal</div>
        </div>
        <button class="food-delete" title="ลบ">🗑</button>
      </div>
    `).join("");

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

  // day summary
  const all = [...(day.breakfast||[]), ...(day.lunch||[]), ...(day.dinner||[])];
  const t = calcMealTotals(all);
  const summary = document.getElementById("food-day-summary");
  if (summary) summary.innerText = `แคลอรี่รวม ${t.cal} kcal • โปรตีน ${t.p}g • คาร์บ ${t.c}g • ไขมัน ${t.f}g`;
}

function openFoodDetail(meal, idx) {
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
}

function closeFoodDetail() {
  const modal = document.getElementById("food-detail-modal");
  if (modal) modal.style.display = "none";
  __foodDetailCtx = null;
}

function removeFoodFromDetail() {
  if (!__foodDetailCtx) return;
  removeFoodItem(__foodDetailCtx.meal, __foodDetailCtx.idx);
  closeFoodDetail();
}

function removeFoodItem(meal, idx) {
  const log = getFoodLog();
  const today = getTodayKey();
  const list = log?.[today]?.[meal];
  if (!Array.isArray(list)) return;

  list.splice(idx, 1);
  saveFoodLog(log);
  renderFoodPage();
  loadUserData(); // refresh dashboard totals
  showToast("ลบรายการอาหารแล้ว", "info");
}

function openFoodLibrary() {
  // ใช้ modal-search เดิมเป็น Food Library
  openSearchModal();
  renderFoodLibrary();
}

function openFoodCustom() {
  switchToManual();
  // sync meal default from library select (ถ้ามี)
  const libSel = document.getElementById("lib-meal-select");
  const mealSel = document.getElementById("food-meal");
  if (libSel && mealSel) mealSel.value = libSel.value || "breakfast";
}

function renderFoodLibrary() {
  const el = document.getElementById("food-library-list");
  if (!el) return;

  el.innerHTML = foodLibrary.map(x => `
    <div class="food-item" data-food-id="${x.id}">
      <img src="${x.img || ""}" alt="${x.name}">
      <div class="food-info">
        <div class="food-title">${x.name}</div>
        <div class="food-meta">${x.cal} kcal • P${x.p} C${x.c} F${x.f}</div>
      </div>
      <button class="btn-primary" style="padding:8px 12px; border-radius:12px;" data-add>เพิ่ม</button>
    </div>
  `).join("");

  el.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = e.target.closest('[data-food-id]');
      const id = row?.dataset.foodId;
      const food = foodLibrary.find(f => f.id === id);
      const mealSel = document.getElementById("lib-meal-select");
      const meal = mealSel?.value || "breakfast";
      if (food) addFoodToMeal(meal, food);
    });
  });
}

function addFoodToMeal(meal, food) {
  if (!FOOD_MEALS.includes(meal)) meal = "breakfast";

  const log = getFoodLog();
  const today = getTodayKey();
  const entry = normalizeFoodEntry(food);

  log[today][meal].push(entry);
  saveFoodLog(log);

  renderFoodPage();
  loadUserData();
  showToast(`เพิ่ม "${entry.name}" ไปที่ ${FOOD_MEAL_LABEL[meal]} แล้ว`, "success");
}

// ใช้กับปุ่ม "บันทึกเมนู" ใน modal-manual
function saveCustomFood() {
  const meal = document.getElementById("food-meal")?.value || "breakfast";
  const name = document.getElementById("food-name")?.value?.trim();
  const cal = Number(document.getElementById("food-cal")?.value || 0);
  const p = Number(document.getElementById("food-p")?.value || 0);
  const c = Number(document.getElementById("food-c")?.value || 0);
  const f = Number(document.getElementById("food-f")?.value || 0);
  const img = document.getElementById("food-img")?.value?.trim() || "";

  if (!name) {
    showToast("⚠️ กรุณาใส่ชื่อเมนู", "warning");
    return;
  }
  if (!cal || cal < 0) {
    showToast("⚠️ ใส่แคลอรี่ให้ถูกต้อง", "warning");
    return;
  }

  addFoodToMeal(meal, { name, cal, p, c, f, img });

  // clear inputs
  const ids = ["food-name", "food-cal", "food-p", "food-c", "food-f", "food-img"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

  closeAllModals();
}


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
const workoutLogKey = ukey("fit_workout_log");
let workoutLog = JSON.parse(localStorage.getItem(workoutLogKey)) || {};

let currentCalDate = new Date();
let activeTitle = null;
let activeSetIndex = 0;
let activeMode = "do"; // เพิ่มตัวแปรเก็บ mode ปัจจุบัน
let activeImgUrl = ""; // รูป/ภาพท่าใน Modal (สำหรับโหมดดูเฉยๆ)

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function saveSet(dateKey, title, setNo, reps, note) {
  if (!workoutLog[dateKey]) workoutLog[dateKey] = {};
  if (!workoutLog[dateKey][title]) {
    const d = workoutDB[title];
    workoutLog[dateKey][title] = { targetSets: d.sets, repsGuide: d.repsGuide, sets: [] };
  }
  workoutLog[dateKey][title].sets.push({ setNo, reps, note: note || "", ts: Date.now() });
  localStorage.setItem(workoutLogKey, JSON.stringify(workoutLog));
}

/* =========================================
   4. WORKOUT MODAL SYSTEM (ปรับปรุงแล้ว)
   ========================================= */
function openWorkoutModal(title, mode = "do", imgUrl = "") {
  const data = workoutDB[title];
  const timerModal = document.getElementById('timer-modal');

  if (!data || !timerModal) {
    console.warn('ไม่พบข้อมูลท่า:', title);
    showToast("⚠️ ไม่พบข้อมูลท่านี้", "warning");
    return;
  }

  activeTitle = title;
  activeSetIndex = 0;
  activeMode = mode; // เก็บ mode ไว้
  activeImgUrl = imgUrl || "";

  setText('modal-title', title);
  setText('instruction-text', `${data.instruction} (แนะนำ ${data.sets} เซ็ต • ${data.repsGuide})`);
  // แผนสั้นๆ (ใช้แสดงเหมือนการ์ดในรูป)
  const planEl = document.getElementById('modal-plan-text');
  if (planEl) {
    const planText = (data.sets && data.sets > 1)
      ? `${data.repsGuide} x ${data.sets} เซ็ต`
      : `${data.repsGuide}`;
    planEl.innerText = planText;
  }

  // รูปท่า (ถ้ามี)
  const imgEl = document.getElementById('modal-image');
  if (imgEl) {
    if (activeImgUrl) {
      imgEl.src = activeImgUrl;
      imgEl.style.display = '';
    } else {
      imgEl.removeAttribute('src');
      imgEl.style.display = 'none';
    }
  }

  setText('set-target', data.sets);
  setText('set-current', 1);

  // ตั้งค่า input fields
  const repsInput = document.getElementById('reps-input');
  const noteInput = document.getElementById('note-input');
  if (repsInput) repsInput.value = (data.defaultReps ?? "");
  if (noteInput) noteInput.value = "";

  // สลับโหมด UI พร้อม null checks
  const logBtn = document.getElementById('log-set-btn');
  const finishBtn = document.getElementById('finish-workout-btn');
  const setCounter = document.getElementById('set-counter');
  const repsLabel = document.querySelector('label[for="reps-input"]');
  const noteLabel = document.querySelector('label[for="note-input"]');

  if (mode === "view") {
    // โหมดดูเฉยๆ (Workout Arena) - ไม่ให้บันทึก แต่ยังเปิดดูคำแนะนำได้
    const logSection = document.querySelector('#timer-modal .xmodal-log');
    if (logSection) logSection.style.display = "none";

    if (logBtn) {
      logBtn.style.display = "";
      logBtn.innerText = "🔍 ดูท่าเพิ่ม";
    }
    if (finishBtn) {
      finishBtn.style.display = "";
      finishBtn.innerText = "✅ เสร็จ";
      finishBtn.style.background = "#10B981";
    }
  } else {
    // โหมดทำจริง (ภารกิจวันนี้) - บันทึกเซ็ตได้ตามปกติ
    const logSection = document.querySelector('#timer-modal .xmodal-log');
    if (logSection) logSection.style.display = "";

    if (logBtn) {
      logBtn.style.display = "";
      logBtn.innerText = "บันทึกเซ็ต ✅";
    }
    if (finishBtn) {
      finishBtn.style.display = "";
      finishBtn.innerText = "จบวันนี้";
      finishBtn.style.background = "#333";
    }
  }

  timerModal.style.display = 'flex';
  playSound('beep');

  if (mode === "view") {
    showToast(`📖 ดูคำแนะนำ: ${title}`, 'info');
  } else {
    showToast(`🏋️ เริ่มท่า ${title}!`, 'info');
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

/* =========================================
   5. LIST RENDERING FUNCTIONS
   ========================================= */
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
      <div class="li-pick"></div>
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

/* =========================================
   7. DOM CONTENT LOADED (ปรับปรุงแล้ว)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 FitLife Easy Fixed Version กำลังโหลด...');

  // เช็ค User
  if (!localStorage.getItem(ukey("fit_user"))) {
    const wizard = document.getElementById('onboarding-modal');
    if (wizard) {
      wizard.style.display = 'flex';
      showStep(1);
    }
  } else {
    loadUserData();
  }

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

  // ✅ Render Workout & Meal Lists
  renderList("workout-list", workoutData, ukey("selectedWorkout"), (item) => {
    if (workoutDB[item.modalName]) {
      openWorkoutModal(item.modalName, "do");
    }
  });

  renderList("meal-list", mealData, ukey("selectedMeal"), (item) => {
    if (typeof navigateTo === "function") {
      navigateTo("food");
    }
  });

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
          if (workoutDB[title]) {
            openWorkoutModal(title, "do");
          } else {
            showToast(`ไม่พบข้อมูลท่า "${title}"`, 'warning');
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
      hydrateArenaImages();
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
});

/* =========================================
   8. NAVIGATION
   ========================================= */
window.navigateTo = function (pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-page') === pageId) btn.classList.add('active');
  });
};

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

/* =========================================
   10. WIZARD & USER DATA
   ========================================= */
let currentStep = 1;
const totalSteps = 3;

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

  if (!name || !weight || !height) {
    showToast("⚠️ กรุณากรอกข้อมูลให้ครบ", "warning");
    return;
  }

  const goal = document.getElementById('selected-goal')?.value || 'maintain';
  const focus = document.getElementById('selected-focus')?.value || 'full-body';

  const datesStr = document.getElementById('selected-dates')?.value || "";
  const workoutDates = datesStr.split(',').map(s => s.trim()).filter(Boolean);

  const hM = height / 100;
  const bmi = weight / (hM * hM);
  let bmiStatus = bmi < 18.5 ? "ผอม" : (bmi < 23 ? "ปกติ" : (bmi < 25 ? "ท้วม" : "อ้วน"));

  let tdee = ((10 * weight) + (6.25 * height) - (5 * age) + 5) * 1.35;
  if (goal === 'lose-fat') tdee -= 400;
  else if (goal === 'build-muscle') tdee += 300;

  localStorage.setItem(ukey("fit_user"), JSON.stringify({
    name, weight, height, age,
    goal, focus,
    workoutDates,
    tdee: Math.round(tdee), bmi, bmiStatus
  }));

  loadUserData();
  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.style.display = 'none';
  showToast(`ยินดีต้อนรับ ${name}!`, "success");
  navigateTo('dashboard');
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
const foodLog = getFoodLog();
const todayKey = getTodayKey();
const dayFood = foodLog[todayKey] || { breakfast: [], lunch: [], dinner: [] };
const allFood = [...(dayFood.breakfast || []), ...(dayFood.lunch || []), ...(dayFood.dinner || [])];

let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
allFood.forEach(food => {
  totalCal += Number(food.cal || 0);
  totalP += Number(food.p || 0);
  totalC += Number(food.c || 0);
  totalF += Number(food.f || 0);
});

// render food page (ถ้ามีอยู่)
renderFoodPage();

(food => {
    totalCal += food.cal;
    totalP += food.p;
    totalC += food.c;
    totalF += food.f;
  });

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

function addFoodItem(name, cal, p, c, f) {
  let currentLog = JSON.parse(localStorage.getItem(ukey("fit_food_log"))) || [];
  currentLog.push({ name, cal, p, c, f });
  localStorage.setItem(ukey("fit_food_log"), JSON.stringify(currentLog));
  loadUserData();
  showToast(`เพิ่มเมนู "${name}" แล้ว!`, "success");
}

/* =========================================
   12. FOOD MODAL
   ========================================= */
function openFoodModal() {
  const modal = document.getElementById('food-modal');
  if (modal) modal.style.display = 'flex';
}

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

/* =========================================
   13. WATER TRACKER
   ========================================= */
let waterIntake = 750;
const waterGoal = 2000;

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
function openDashMealDetail(data){
  const modal = document.getElementById('dash-meal-modal');
  if(!modal) return;

  const titleEl = document.getElementById('dash-meal-title');
  const subEl   = document.getElementById('dash-meal-sub');
  const imgEl   = document.getElementById('dash-meal-img');

  const kcalEl = document.getElementById('dash-kcal');
  const pEl    = document.getElementById('dash-p');
  const cEl    = document.getElementById('dash-c');
  const fEl    = document.getElementById('dash-f');

  titleEl.textContent = data?.title || 'รายละเอียดอาหาร';
  subEl.textContent   = (data?.meal ? `${data.meal} • ` : '') + (data?.kcal != null ? `${data.kcal} kcal` : '');

  if(imgEl){
    imgEl.src = data?.img || '';
    imgEl.style.display = data?.img ? 'block' : 'none';
  }

  if(kcalEl) kcalEl.textContent = `${data?.kcal ?? 0} kcal`;
  if(pEl)    pEl.textContent    = `${data?.protein ?? 0} g`;
  if(cEl)    cEl.textContent    = `${data?.carbs ?? 0} g`;
  if(fEl)    fEl.textContent    = `${data?.fat ?? 0} g`;

  modal.style.display = 'flex';
  // close when click backdrop
  modal.onclick = (e)=>{ if(e.target === modal) closeDashMealDetail(); };
}

function closeDashMealDetail(){
  const modal = document.getElementById('dash-meal-modal');
  if(!modal) return;
  modal.style.display = 'none';
}
