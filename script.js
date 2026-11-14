// =========================
// 1. Settings
// =========================
const METHOD = 1; // University of Islamic Sciences, Karachi
const SCHOOL = 1; // Hanafi Asr

const PRAYERS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

const ICONS = {
  Fajr: "🌅",
  Sunrise: "☀️",
  Dhuhr: "🌞",
  Asr: "🌤️",
  Maghrib: "🌇",
  Isha: "🌙"
};

// =========================
// 2. Page elements
// =========================
const masjidInput = document.getElementById("masjidInput");
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const loadBtn = document.getElementById("loadBtn");
const printBtn = document.getElementById("printBtn");

const masjidTitle = document.getElementById("masjidTitle");
const gregorianDate = document.getElementById("gregorianDate");
const hijriDate = document.getElementById("hijriDate");
const clock = document.getElementById("clock");

const nextName = document.getElementById("nextName");
const countdown = document.getElementById("countdown");
const sehriTime = document.getElementById("sehriTime");
const iftarTime = document.getElementById("iftarTime");

const prayerGrid = document.getElementById("prayerGrid");
const monthTitle = document.getElementById("monthTitle");
const tableBody = document.getElementById("tableBody");
const loader = document.getElementById("loader");
const error = document.getElementById("error");

// =========================
// 3. Saved data
// =========================
let todayTimes = null;   // { Fajr: "05:12", ... }
let tomorrowFajr = null; // "05:13"
let loadedDay = null;    // day of month when data loaded
let timer = null;

// =========================
// 4. Helper functions
// =========================

// "05:12 (PKT)" becomes "05:12"
function cleanTime(time) {
  return time.split(" ")[0];
}

// "17:45" becomes "5:45 PM"
function to12Hour(time) {
  let [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${pad(minute)} ${period}`;
}

// "17:45" becomes a Date for today (or later days)
function toDate(time, addDays = 0) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setDate(date.getDate() + addDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// 5 becomes "05"
function pad(number) {
  return String(number).padStart(2, "0");
}

function showError(message) {
  error.textContent = message;
}

// =========================
// 5. Load prayer times
// =========================
async function loadTimes() {
  const city = cityInput.value.trim();
  const country = countryInput.value.trim();
  const masjid = masjidInput.value.trim();

  if (!city || !country) {
    showError("Please enter a city and a country.");
    return;
  }

  saveSettings(masjid, city, country);
  masjidTitle.textContent = masjid || "Prayer Times";

  showError("");
  loader.classList.add("show");
  prayerGrid.innerHTML = "";
  tableBody.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const url =
    `https://api.aladhan.com/v1/calendarByCity/${year}/${month}` +
    `?city=${encodeURIComponent(city)}` +
    `&country=${encodeURIComponent(country)}` +
    `&method=${METHOD}&school=${SCHOOL}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || result.code !== 200) {
      throw new Error("City not found");
    }

    const days = result.data;
    const todayIndex = now.getDate() - 1;
    const today = days[todayIndex];
    const tomorrow = days[todayIndex + 1] || today;

    // Keep clean times for the countdown
    todayTimes = {};
    PRAYERS.forEach(name => {
      todayTimes[name] = cleanTime(today.timings[name]);
    });
    tomorrowFajr = cleanTime(tomorrow.timings.Fajr);
    loadedDay = now.getDate();

    showDates(today);
    showRoza(today);
    showCards();
    showTable(days, todayIndex);
    startCountdown();
  } catch (err) {
    showError("Could not load times. Check the city name and your internet.");
  } finally {
    loader.classList.remove("show");
  }
}

// =========================
// 6. Show data on page
// =========================
function showDates(today) {
  const g = today.date.gregorian;
  const h = today.date.hijri;

  gregorianDate.textContent = `${g.weekday.en}, ${today.date.readable}`;
  hijriDate.textContent = `${h.day} ${h.month.en} ${h.year} AH`;
}

function showRoza(today) {
  sehriTime.textContent = to12Hour(cleanTime(today.timings.Imsak));
  iftarTime.textContent = to12Hour(cleanTime(today.timings.Maghrib));
}

function showCards() {
  PRAYERS.forEach((name, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.id = "card-" + name;
    card.style.animationDelay = index * 0.1 + "s";

    card.innerHTML = `
      <span class="card-icon">${ICONS[name]}</span>
      <p class="card-name">${name}</p>
      <p class="card-time">${to12Hour(todayTimes[name])}</p>
    `;

    prayerGrid.appendChild(card);
  });
}

function showTable(days, todayIndex) {
  const first = days[0].date.gregorian;
  monthTitle.textContent = `${first.month.en} ${first.year} Timetable`;

  days.forEach((day, index) => {
    const g = day.date.gregorian;
    const row = document.createElement("tr");

    if (index === todayIndex) {
      row.className = "today";
    }
    row.style.animationDelay = index * 0.03 + "s";

    // Date, day name, Hijri date
    let cells = `
      <td>${g.day} ${g.month.en.slice(0, 3)}</td>
      <td>${g.weekday.en.slice(0, 3)}</td>
      <td>${day.date.hijri.day}</td>
    `;

    // Prayer times
    PRAYERS.forEach(name => {
      cells += `<td>${to12Hour(cleanTime(day.timings[name]))}</td>`;
    });

    row.innerHTML = cells;
    tableBody.appendChild(row);
  });
}

// =========================
// 7. Countdown and clock
// =========================
function getNextPrayer() {
  const now = new Date();

  for (const name of PRAYERS) {
    if (name === "Sunrise") continue; // Sunrise is no prayer
    const time = toDate(todayTimes[name]);
    if (time > now) {
      return { name, time };
    }
  }

  // All prayers passed: next is tomorrow's Fajr
  return { name: "Fajr", time: toDate(tomorrowFajr, 1) };
}

function updateCountdown() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString();

  // New day started: load fresh times
  if (now.getDate() !== loadedDay) {
    loadTimes();
    return;
  }

  const next = getNextPrayer();
  const diff = next.time - now;

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  nextName.textContent = next.name;
  countdown.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  // Highlight the next prayer card
  document.querySelectorAll(".card").forEach(card => {
    card.classList.toggle("active", card.id === "card-" + next.name);
  });
}

function startCountdown() {
  clearInterval(timer);
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
}

// =========================
// 8. Save and restore settings
// =========================
function saveSettings(masjid, city, country) {
  try {
    localStorage.setItem("prayerSettings", JSON.stringify({ masjid, city, country }));
  } catch (err) {
    // Storage blocked: skip saving
  }
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("prayerSettings"));
    if (saved) {
      masjidInput.value = saved.masjid || "";
      cityInput.value = saved.city || "Lahore";
      countryInput.value = saved.country || "Pakistan";
    }
  } catch (err) {
    // Storage blocked: use default values
  }
}

// =========================
// 9. Stars background
// =========================
function makeStars() {
  const box = document.querySelector(".stars");

  for (let i = 0; i < 70; i++) {
    const star = document.createElement("span");
    star.className = "star";
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 100 + "%";
    star.style.animationDelay = Math.random() * 3 + "s";
    box.appendChild(star);
  }
}

// =========================
// 10. Events and start
// =========================
loadBtn.addEventListener("click", loadTimes);
printBtn.addEventListener("click", () => window.print());

// Press Enter in any input to load
[masjidInput, cityInput, countryInput].forEach(input => {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") loadTimes();
  });
});

makeStars();
restoreSettings();
loadTimes();
