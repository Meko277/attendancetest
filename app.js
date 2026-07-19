/* ==========================================================================
   FIREBASE SETUP
   --------------------------------------------------------------------------
   1. Go to https://console.firebase.google.com, create a project (free tier
      is plenty), then add a "Web app" inside it.
   2. Firebase will give you a config object that looks just like the one
      below. Copy YOUR values into firebaseConfig.
   3. In the Firebase console, go to Build > Firestore Database > Create
      database (start in test mode while you're developing).
   4. That's it — every browser tab that has this page open (phone, PC,
      tablet...) will now stay in sync automatically through onSnapshot.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
// vvvvvvvvvvvvvvvvvvvvvv  PASTE YOUR FIREBASE CONFIG HERE  vvvvvvvvvvvvvvvvvvvvvv
export const firebaseConfig = {
  apiKey: "AIzaSyD4ENSYFjyTA1N5gBleUMVTOJsP2i4EnmU", // ❗ Replace with your actual API key
  authDomain: "attendance-765b1.firebaseapp.com",
  projectId: "attendance-765b1",
  storageBucket: "attendance-765b1.firebasestorage.app",
  messagingSenderId: "533258210848",
  appId: "1:533258210848:web:7910c1636d4ed3f8573645",
  measurementId: "G-LV64L0Y8SB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const childrenCollection = collection(db, "children");

/* ==========================================================================
   RANK / TIER SYSTEM
   Points translate into a fun progression: Rookie -> Bronze -> Silver -> Gold.
   The ring around each avatar fills up as a child moves through a tier.
   ========================================================================== */
const TIERS = [
  { name: "Rookie", emoji: "🌱", min: 0, max: 49, color: "var(--tier-rookie)" },
  {
    name: "Bronze Star",
    emoji: "🥉",
    min: 50,
    max: 149,
    color: "var(--tier-bronze)",
  },
  {
    name: "Silver Star",
    emoji: "🥈",
    min: 150,
    max: 299,
    color: "var(--tier-silver)",
  },
  {
    name: "Gold Star",
    emoji: "🥇",
    min: 300,
    max: Infinity,
    color: "var(--tier-gold)",
  },
];

function getTier(points) {
  return (
    TIERS.find((tier) => points >= tier.min && points <= tier.max) || TIERS[0]
  );
}

// Ring circumference for r=52 (2 * PI * 52), matches the value hardcoded in style.css
const RING_CIRCUMFERENCE = 326.7;

function getRingProgress(points, tier) {
  if (tier.max === Infinity) return 1; // Gold tier: always show a full, glowing ring
  const span = tier.max - tier.min + 1;
  const progressIntoTier = points - tier.min;
  return Math.min(Math.max(progressIntoTier / span, 0), 1);
}

/* ==========================================================================
   DOM REFERENCES
   ========================================================================== */
const childGrid = document.getElementById("childGrid");
const emptyState = document.getElementById("emptyState");
const cardTemplate = document.getElementById("childCardTemplate");

const openAddModalBtn = document.getElementById("openAddModalBtn");
const emptyStateAddBtn = document.getElementById("emptyStateAddBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const childModalOverlay = document.getElementById("childModalOverlay");
const childForm = document.getElementById("childForm");
const modalTitle = document.getElementById("modalTitle");
const saveChildBtn = document.getElementById("saveChildBtn");
const formError = document.getElementById("formError");

// Points modal elements
const pointsModalOverlay = document.getElementById("pointsModalOverlay");
const closePointsModalBtn = document.getElementById("closePointsModalBtn");
const pointsModalName = document.getElementById("pointsModalName");
const pointsModalGrade = document.getElementById("pointsModalGrade");
const pointsModalRank = document.getElementById("pointsModalRank");
const pointsModalValue = document.getElementById("pointsModalValue");
const pointsModalRingFill = document.querySelector(".ring-fill--large");
const pointsModalAvatarInitials = document.querySelector(".avatar-initials--large");
const pointsModalRankBadge = document.querySelector(".rank-badge--large");

// Form fields
const fieldName = document.getElementById("fieldName");
const fieldDob = document.getElementById("fieldDob");
const fieldGrade = document.getElementById("fieldGrade");
const fieldAddress = document.getElementById("fieldAddress");
const fieldPhone = document.getElementById("fieldPhone");
const fieldMotherPhone = document.getElementById("fieldMotherPhone");
const fieldSchool = document.getElementById("fieldSchool");
const fieldTalent = document.getElementById("fieldTalent");
const fieldFatherConfession = document.getElementById("fieldFatherConfession");
const fieldInScout = document.getElementById("fieldInScout");
const fieldFatherJob = document.getElementById("fieldFatherJob");
const fieldFatherPhone = document.getElementById("fieldFatherPhone");
const fieldFatherFatherConfession = document.getElementById("fieldFatherFatherConfession");
const fieldChurch = document.getElementById("fieldChurch");
const fieldMotherName = document.getElementById("fieldMotherName");
const fieldMotherJob = document.getElementById("fieldMotherJob");
const fieldMotherFatherConfession = document.getElementById("fieldMotherFatherConfession");
const fieldSiblingsCount = document.getElementById("fieldSiblingsCount");
const fieldSiblingsNames = document.getElementById("fieldSiblingsNames");
const fieldSiblingsDob = document.getElementById("fieldSiblingsDob");
const fieldNotes = document.getElementById("fieldNotes");

// Search
const searchInput = document.getElementById("searchInput");

const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const connectionStatus = document.getElementById("connectionStatus");
const connectionStatusText = document.getElementById("connectionStatusText");

const toastEl = document.getElementById("toast");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const THEME_STORAGE_KEY = "star-trackers-theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);

  if (themeToggleBtn) {
    themeToggleBtn.setAttribute("aria-pressed", String(isDark));
    const icon = themeToggleBtn.querySelector(".theme-toggle__icon");
    const label = themeToggleBtn.querySelector(".theme-toggle__label");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
  }

  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

// Keeps track of every rendered card element, keyed by Firestore doc id,
// so we can update cards in place instead of re-rendering the whole grid
// (that's what makes the point "pop" and ring fill feel smooth).
const cardElementsById = new Map();

// Remembers each child's last-known point total so we can animate the
// number counting from its old value up (or down) to its new value.
const lastKnownPointsById = new Map();

// Which child id is currently targeted by the edit modal / delete modal.
let editingChildId = null;
let deletingChildId = null;

// Search query
let searchQuery = "";

// Grade filter
let gradeFilter = "all";

// Store all children data for sorting
const childrenDataById = new Map();

initTheme();

// Grade filter event handlers
const gradeFilterButtons = document.querySelectorAll(".grade-filter-btn");
gradeFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Update active state
    gradeFilterButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    
    // Set the filter
    gradeFilter = btn.dataset.grade;
    
    // Apply filters
    filterChildren();
  });
});

// Set "All" as active by default
document.querySelector('.grade-filter-btn[data-grade="all"]')?.classList.add("is-active");

/* ==========================================================================
   RENDERING HELPERS
   ========================================================================== */

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDob(dobString) {
  if (!dobString) return "";
  const date = new Date(dobString + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dobString;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculateAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString + "T00:00:00");
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

// Smoothly counts a number element from one value to another (ease-out cubic).
function animateNumber(element, fromValue, toValue, duration = 600) {
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(fromValue + (toValue - fromValue) * eased);
    element.textContent = currentValue;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

// Briefly adds a CSS class to trigger an animation, then removes it so the
// animation can be replayed again later (e.g. every time points change).
function replayAnimation(element, className, duration) {
  element.classList.remove(className);
  // Force a reflow so the browser notices the class was removed before we re-add it.
  void element.offsetWidth;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), duration);
}

// Shows a little "+N" (or "-N") that floats up and fades near the point total.
function spawnFloater(pointsDisplayEl, amount) {
  const floater = document.createElement("span");
  floater.className = "floater";
  floater.textContent = (amount > 0 ? "+" : "") + amount;
  if (amount < 0) floater.style.color = "var(--coral)";
  floater.style.left = "50%";
  floater.style.top = "-4px";
  floater.style.transform = "translateX(-50%)";
  pointsDisplayEl.style.position = "relative";
  pointsDisplayEl.appendChild(floater);
  setTimeout(() => floater.remove(), 900);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden", "is-leaving");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.add("is-leaving");
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, 2200);
}

function updateEmptyState() {
  const hasChildren = cardElementsById.size > 0;
  emptyState.classList.toggle("hidden", hasChildren);
  childGrid.classList.toggle("hidden", !hasChildren);
}

/* ==========================================================================
   SEARCH & FILTER FUNCTIONALITY
   ========================================================================== */
function filterChildren() {
  const query = searchQuery.toLowerCase().trim();
  cardElementsById.forEach((card) => {
    const name = (card.dataset.name || "").toLowerCase();
    const grade = (card.dataset.grade || "").toLowerCase();
    const school = (card.dataset.school || "").toLowerCase();
    const talent = (card.dataset.talent || "").toLowerCase();
    
    // Check search query match
    const matchesQuery = name.includes(query) || grade.includes(query) || school.includes(query) || talent.includes(query);
    
    // Check grade filter match
    const matchesGrade = gradeFilter === "all" || card.dataset.grade === gradeFilter;
    
    // Show card only if both filters pass
    card.classList.toggle("hidden", !(matchesQuery && matchesGrade));
  });
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    filterChildren();
  });
}

/* ==========================================================================
   BUILD / UPDATE A SINGLE CARD
   ========================================================================== */

function buildCardElement(id, data) {
  const fragment = cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".child-card");
  card.dataset.id = id;
  applyCardData(card, data, { isNew: true });
  return card;
}

function applyCardData(card, data, { isNew = false } = {}) {
  const points = data.points || 0;
  const tier = getTier(points);
  const progress = getRingProgress(points, tier);

  // Stash the raw field values on the card's dataset so the edit modal can
  // read them back exactly, without needing a second Firestore lookup.
  card.dataset.name = data.name || "";
  card.dataset.dob = data.dob || "";
  card.dataset.grade = data.grade || "";
  card.dataset.address = data.address || "";
  card.dataset.phone = data.phone || "";
  card.dataset.motherPhone = data.motherPhone || "";
  card.dataset.school = data.school || "";
  card.dataset.talent = data.talent || "";
  card.dataset.fatherConfession = data.fatherConfession || "no";
  card.dataset.inScout = data.inScout || "no";
  card.dataset.fatherJob = data.fatherJob || "";
  card.dataset.fatherPhone = data.fatherPhone || "";
  card.dataset.fatherFatherConfession = data.fatherFatherConfession || "no";
  card.dataset.church = data.church || "";
  card.dataset.motherName = data.motherName || "";
  card.dataset.motherJob = data.motherJob || "";
  card.dataset.motherFatherConfession = data.motherFatherConfession || "no";
  card.dataset.siblingsCount = data.siblingsCount || "";
  card.dataset.siblingsNames = data.siblingsNames || "";
  card.dataset.siblingsDob = data.siblingsDob || "";
  card.dataset.notes = data.notes || "";

  // Name / meta text
  const age = calculateAge(data.dob);
  card.querySelector(".avatar-initials").textContent = getInitials(
    data.name || "?",
  );
  card.querySelector(".child-name").textContent = data.name || "Unnamed";
  card.querySelector(".child-grade").textContent = data.grade || "No grade set";
  card.querySelector(".child-meta").textContent =
    `Age ${age ?? "?"} · Born ${formatDob(data.dob)}`;
  card.querySelector(".rank-name").textContent = tier.name;

  // Update detail values
  card.querySelector(".child-address").textContent = data.address || "—";
  card.querySelector(".child-phone").textContent = data.phone || data.motherPhone || "—";
  card.querySelector(".child-school").textContent = data.school || "—";
  card.querySelector(".child-talent").textContent = data.talent || "—";
  card.querySelector(".child-father-confession").textContent = data.fatherConfession === "yes" ? "Yes" : "No";
  card.querySelector(".child-in-scout").textContent = data.inScout === "yes" ? "Yes" : "No";
  card.querySelector(".child-father-job").textContent = data.fatherJob || "—";
  card.querySelector(".child-father-phone").textContent = data.fatherPhone || "—";
  card.querySelector(".child-father-father-confession").textContent = data.fatherFatherConfession === "yes" ? "Yes" : "No";
  card.querySelector(".child-church").textContent = data.church || "—";
  card.querySelector(".child-mother-name").textContent = data.motherName || "—";
  card.querySelector(".child-mother-phone").textContent = data.motherPhone || "—";
  card.querySelector(".child-mother-job").textContent = data.motherJob || "—";
  card.querySelector(".child-mother-father-confession").textContent = data.motherFatherConfession === "yes" ? "Yes" : "No";
  
  // Format siblings info
  let siblingsText = "—";
  if (data.siblingsCount && data.siblingsCount > 0) {
    const names = data.siblingsNames ? data.siblingsNames.split("\n").filter(n => n.trim()) : [];
    const dobs = data.siblingsDob ? data.siblingsDob.split("\n").filter(d => d.trim()) : [];
    siblingsText = `${data.siblingsCount} sibling${data.siblingsCount > 1 ? 's' : ''}`;
    if (names.length > 0) {
      siblingsText += `: ${names.join(", ")}`;
    }
  }
  card.querySelector(".child-siblings").textContent = siblingsText;
  card.querySelector(".child-notes").textContent = data.notes || "—";

  const rankBadge = card.querySelector(".rank-badge");
  const previousRankEmoji = rankBadge.textContent;
  rankBadge.textContent = tier.emoji;
  rankBadge.title = tier.name;

  // Ring fill: dashoffset goes from full circumference (empty) to 0 (full)
  const ringFill = card.querySelector(".ring-fill");
  ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
  ringFill.style.stroke = tier.color;

  // Points number: animate from the last known value if this is an update
  const pointsNumberEl = card.querySelector(".points-number");
  const pointsDisplayEl = card.querySelector(".points-display");
  const previousPoints = lastKnownPointsById.has(card.dataset.id)
    ? lastKnownPointsById.get(card.dataset.id)
    : points;

  if (isNew) {
    pointsNumberEl.textContent = points;
  } else if (previousPoints !== points) {
    animateNumber(pointsNumberEl, previousPoints, points);
    replayAnimation(pointsNumberEl, "is-popping", 450);
    spawnFloater(pointsDisplayEl, points - previousPoints);
  }

  // If the rank actually changed (and this isn't the very first render), celebrate it
  if (!isNew && previousRankEmoji && previousRankEmoji !== tier.emoji) {
    replayAnimation(rankBadge, "is-leveling-up", 600);
    showToast(`${data.name} leveled up to ${tier.name}! ${tier.emoji}`);
  }

  lastKnownPointsById.set(card.dataset.id, points);
}

/* ==========================================================================
   SORTING HELPER
   ========================================================================== */
function sortCardsByPoints() {
  // Get all cards and sort by points (highest first)
  const cards = Array.from(childGrid.querySelectorAll(".child-card"));
  cards.sort((a, b) => {
    const pointsA = Number(a.querySelector(".points-number")?.textContent || 0);
    const pointsB = Number(b.querySelector(".points-number")?.textContent || 0);
    return pointsB - pointsA; // Descending order (highest first)
  });
  
  // Re-append cards in sorted order
  cards.forEach(card => childGrid.appendChild(card));
}

/* ==========================================================================
   FIRESTORE REAL-TIME LISTENER
   docChanges() tells us precisely which children were added, modified, or
   removed since the last update — that's what lets us animate in place
   instead of redrawing the whole grid every time (which would kill the
   entrance/pop animations and feel janky).
   ========================================================================== */
onSnapshot(
  childrenCollection,
  (snapshot) => {
    setConnectionStatus("live");

    snapshot.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data();

      if (change.type === "added") {
        // Skip re-adding a card we already have (can happen on first load)
        if (cardElementsById.has(id)) {
          applyCardData(cardElementsById.get(id), data);
          return;
        }
        const card = buildCardElement(id, data);
        childGrid.appendChild(card);
        cardElementsById.set(id, card);
      }

      if (change.type === "modified") {
        const card = cardElementsById.get(id);
        if (card) applyCardData(card, data);
      }

      if (change.type === "removed") {
        const card = cardElementsById.get(id);
        if (card) {
          card.classList.add("is-leaving");
          setTimeout(() => {
            card.remove();
            updateEmptyState();
          }, 280);
          cardElementsById.delete(id);
          lastKnownPointsById.delete(id);
        }
      }
    });

    // Sort cards by points (highest first)
    sortCardsByPoints();
    
    updateEmptyState();
    filterChildren(); // Apply search filter after updates
  },
  (error) => {
    console.error("Firestore listener error:", error);
    setConnectionStatus("error");
  },
);

function setConnectionStatus(state) {
  connectionStatus.classList.remove("is-live", "is-error");
  if (state === "live") {
    connectionStatus.classList.add("is-live");
    connectionStatusText.textContent = "Live — syncing across all your devices";
  } else if (state === "error") {
    connectionStatus.classList.add("is-error");
    connectionStatusText.textContent =
      "Couldn't connect — check your Firebase config";
  } else {
    connectionStatusText.textContent = "Connecting to live sync…";
  }
}

/* ==========================================================================
   ADD / EDIT MODAL
   ========================================================================== */
function openAddModal() {
  editingChildId = null;
  modalTitle.textContent = "Add a child";
  saveChildBtn.textContent = "Save child";
  childForm.reset();
  formError.classList.add("hidden");
  childModalOverlay.classList.remove("hidden");
  document.body.classList.add("modal-open");
  fieldName.focus();
}

function closeChildModal() {
  childModalOverlay.classList.add("hidden");
  document.body.classList.remove("modal-open");
  editingChildId = null;
}

function openEditModal(id, data) {
  editingChildId = id;
  modalTitle.textContent = `Edit ${data.name}`;
  saveChildBtn.textContent = "Save changes";
  fieldName.value = data.name || "";
  fieldDob.value = data.dob || "";
  fieldGrade.value = data.grade || "";
  fieldAddress.value = data.address || "";
  fieldPhone.value = data.phone || "";
  fieldMotherPhone.value = data.motherPhone || "";
  fieldSchool.value = data.school || "";
  fieldTalent.value = data.talent || "";
  fieldFatherConfession.value = data.fatherConfession || "no";
  fieldInScout.value = data.inScout || "no";
  fieldFatherJob.value = data.fatherJob || "";
  fieldFatherPhone.value = data.fatherPhone || "";
  fieldFatherFatherConfession.value = data.fatherFatherConfession || "no";
  fieldChurch.value = data.church || "";
  fieldMotherName.value = data.motherName || "";
  fieldMotherJob.value = data.motherJob || "";
  fieldMotherFatherConfession.value = data.motherFatherConfession || "no";
  fieldSiblingsCount.value = data.siblingsCount || "";
  fieldSiblingsNames.value = data.siblingsNames || "";
  fieldSiblingsDob.value = data.siblingsDob || "";
  fieldNotes.value = data.notes || "";
  formError.classList.add("hidden");
  childModalOverlay.classList.remove("hidden");
  document.body.classList.add("modal-open");
  fieldName.focus();
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark")
      ? "light"
      : "dark";
    applyTheme(nextTheme);
  });
}

openAddModalBtn.addEventListener("click", openAddModal);
emptyStateAddBtn.addEventListener("click", openAddModal);
cancelModalBtn.addEventListener("click", closeChildModal);

// Clicking the dark overlay (but not the card itself) closes the modal
childModalOverlay.addEventListener("click", (event) => {
  if (event.target === childModalOverlay) closeChildModal();
});

childForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = fieldName.value.trim();
  const dob = fieldDob.value;
  const grade = fieldGrade.value.trim();
  const address = fieldAddress.value.trim();
  const phone = fieldPhone.value.trim();
  const motherPhone = fieldMotherPhone.value.trim();
  const school = fieldSchool.value.trim();
  const talent = fieldTalent.value.trim();
  const fatherConfession = fieldFatherConfession.value;
  const inScout = fieldInScout.value;
  const fatherJob = fieldFatherJob.value.trim();
  const fatherPhone = fieldFatherPhone.value.trim();
  const fatherFatherConfession = fieldFatherFatherConfession.value;
  const church = fieldChurch.value.trim();
  const motherName = fieldMotherName.value.trim();
  const motherJob = fieldMotherJob.value.trim();
  const motherFatherConfession = fieldMotherFatherConfession.value;
  const siblingsCount = fieldSiblingsCount.value;
  const siblingsNames = fieldSiblingsNames.value.trim();
  const siblingsDob = fieldSiblingsDob.value.trim();
  const notes = fieldNotes.value.trim();

  // The `required` attribute on the inputs prevents most invalid states, but this is a good safeguard.
  if (!name || !dob) {
    formError.textContent = "Please fill in a valid name and date of birth.";
    formError.classList.remove("hidden");
    return;
  }

  saveChildBtn.disabled = true;
  try {
    if (editingChildId) {
      // Editing an existing child: keep their points untouched, update the rest
      await updateDoc(doc(db, "children", editingChildId), {
        name, dob, grade, address, phone, motherPhone, school, talent,
        fatherConfession, inScout, fatherJob, fatherPhone, fatherFatherConfession,
        church, motherName, motherJob, motherFatherConfession, siblingsCount,
        siblingsNames, siblingsDob, notes
      });
      showToast(`${name}'s details were updated`);
    } else {
      // Adding a brand-new child, starting at 0 points
      await addDoc(childrenCollection, {
        name, dob, grade, address, phone, motherPhone, school, talent,
        fatherConfession, inScout, fatherJob, fatherPhone, fatherFatherConfession,
        church, motherName, motherJob, motherFatherConfession, siblingsCount,
        siblingsNames, siblingsDob, notes,
        points: 0,
        createdAt: serverTimestamp(),
      });
      showToast(`${name} was added to the board 🎉`);
    }
    closeChildModal();
  } catch (error) {
    console.error("Error saving child:", error);
    formError.textContent =
      "Something went wrong saving that child. Please try again.";
    formError.classList.remove("hidden");
  } finally {
    saveChildBtn.disabled = false;
  }
});

/* ==========================================================================
   DELETE CONFIRM MODAL
   ========================================================================== */
function openDeleteModal(id, name) {
  deletingChildId = id;
  document.getElementById("deleteModalText").textContent =
    `This will permanently delete ${name}'s record and points.`;
  deleteModalOverlay.classList.remove("hidden");
}

function closeDeleteModal() {
  deleteModalOverlay.classList.add("hidden");
  deletingChildId = null;
}

cancelDeleteBtn.addEventListener("click", closeDeleteModal);
deleteModalOverlay.addEventListener("click", (event) => {
  if (event.target === deleteModalOverlay) closeDeleteModal();
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!deletingChildId) return;
  try {
    await deleteDoc(doc(db, "children", deletingChildId));
  } catch (error) {
    console.error("Error deleting child:", error);
    showToast("Couldn't delete that child — please try again.");
  }
  closeDeleteModal();
});

/* ==========================================================================
   EVENT DELEGATION FOR CARD BUTTONS
   Instead of attaching listeners to every single card (which we'd have to
   redo every time a card is created), we listen once on the grid container
   and figure out which card + button was clicked.
   ========================================================================== */

childGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".child-card");
  if (!card) return;
  const id = card.dataset.id;

  // If clicking on the collapse button or outside the expanded content, close
  if (event.target.closest(".collapse-btn")) {
    toggleCardExpand(card, false);
    return;
  }

  // If card is already expanded and clicking on the overlay background, close it
  if (card.classList.contains("is-expanded") && !event.target.closest(".child-details") && !event.target.closest(".point-controls") && !event.target.closest(".card-top-actions")) {
    toggleCardExpand(card, false);
    return;
  }

  const pointButton = event.target.closest(
    ".btn-point:not(.btn-point--custom)",
  );
  if (pointButton) {
    const amount = Number(pointButton.dataset.amount);
    const action = pointButton.dataset.action || "add";
    updateChildPoints(id, amount, action);
    return;
  }

  const removeCustomBtn = event.target.closest(
    ".btn-point--custom.btn-point--remove",
  );
  if (removeCustomBtn) {
    const form = removeCustomBtn.closest(".custom-point-form");
    const input = form?.querySelector(".custom-point-input");
    const amount = Number(input?.value);
    if (!input?.value.trim() || Number.isNaN(amount) || amount === 0) {
      input?.focus();
      return;
    }
    updateChildPoints(id, amount, "remove");
    input.value = "";
    return;
  }

  // Expand/Collapse button
  if (event.target.closest(".expand-btn")) {
    toggleCardExpand(card, true);
    return;
  }

  // Edit button: first expand the card to show all details, then open the edit modal
  if (event.target.closest(".edit-btn")) {
    // Expand the card first to show all details
    if (!card.classList.contains("is-expanded")) {
      toggleCardExpand(card, true);
    }
    // Then open the edit modal
    openEditModal(id, {
      name: card.dataset.name || "",
      dob: card.dataset.dob || "",
      grade: card.dataset.grade || "",
      address: card.dataset.address || "",
      phone: card.dataset.phone || "",
      motherPhone: card.dataset.motherPhone || "",
      school: card.dataset.school || "",
      talent: card.dataset.talent || "",
      fatherConfession: card.dataset.fatherConfession || "no",
      inScout: card.dataset.inScout || "no",
      fatherJob: card.dataset.fatherJob || "",
      fatherPhone: card.dataset.fatherPhone || "",
      fatherFatherConfession: card.dataset.fatherFatherConfession || "no",
      church: card.dataset.church || "",
      motherName: card.dataset.motherName || "",
      motherJob: card.dataset.motherJob || "",
      motherFatherConfession: card.dataset.motherFatherConfession || "no",
      siblingsCount: card.dataset.siblingsCount || "",
      siblingsNames: card.dataset.siblingsNames || "",
      siblingsDob: card.dataset.siblingsDob || "",
      notes: card.dataset.notes || "",
    });
    return;
  }

  // Delete button
  if (event.target.closest(".delete-btn")) {
    const name = card.querySelector(".child-name").textContent;
    openDeleteModal(id, name);
    return;
  }

  // Click on points display to open points modal
  if (event.target.closest(".points-display") && !card.classList.contains("is-expanded")) {
    openPointsModal(id, {
      name: card.dataset.name || "",
      grade: card.dataset.grade || "",
      points: lastKnownPointsById.get(id) || 0,
    });
    return;
  }

  // Click on card itself to expand (if not already expanded)
  if (!card.classList.contains("is-expanded")) {
    toggleCardExpand(card, true);
  }
});

// Custom point amount form (submit via Enter key or the "Add" button)
childGrid.addEventListener("submit", (event) => {
  const form = event.target.closest(".custom-point-form");
  if (!form) return;
  event.preventDefault();

  const card = form.closest(".child-card");
  const input = form.querySelector(".custom-point-input");
  const amount = Number(input.value);

  if (!input.value.trim() || Number.isNaN(amount) || amount === 0) {
    input.focus();
    return;
  }

  updateChildPoints(card.dataset.id, amount, "add");
  input.value = "";
});

async function updateChildPoints(id, amount, action = "add") {
  const delta = action === "remove" ? -Math.abs(amount) : Math.abs(amount);
  try {
    // Firestore's increment() applies the change atomically on the server,
    // so simultaneous taps from a phone and a PC never overwrite each other.
    await updateDoc(doc(db, "children", id), { points: increment(delta) });
  } catch (error) {
    console.error("Error updating points:", error);
    showToast("Couldn't update points — please try again.");
  }
}

/* ==========================================================================
   COLLAPSIBLE CARD LOGIC
   ========================================================================== */
// Track the currently expanded card
let expandedCardId = null;
const expandOverlay = document.getElementById("expandOverlay");
const appContainer = document.querySelector(".app");

function toggleCardExpand(card, expand) {
  const id = card.dataset.id;
  
  if (expand) {
    // If another card is expanded, collapse it first
    if (expandedCardId && expandedCardId !== id) {
      const prevCard = cardElementsById.get(expandedCardId);
      if (prevCard) {
        toggleCardExpand(prevCard, false);
      }
    }
    
    // Get the card's original position and dimensions
    const rect = card.getBoundingClientRect();
    const startX = rect.left;
    const startY = rect.top;
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    // Set initial position for animation
    card.style.top = startY + "px";
    card.style.left = startX + "px";
    card.style.width = startWidth + "px";
    card.style.height = startHeight + "px";
    card.style.margin = "0";
    
    // Add expanding class to trigger animation
    card.classList.add("is-expanding");
    
    // Force reflow
    void card.offsetWidth;
    
    // Expand this card
    card.classList.add("is-expanded");
    expandedCardId = id;
    
    // Blur the background
    if (appContainer) {
      appContainer.classList.add("blur-when-expanded");
    }
    
    // Show the overlay
    if (expandOverlay) {
      expandOverlay.classList.add("visible");
    }
  } else {
    // Collapse this card
    card.classList.remove("is-expanded");
    card.classList.remove("is-expanding");
    if (expandedCardId === id) {
      expandedCardId = null;
    }
    
    // Remove blur from background
    if (appContainer) {
      appContainer.classList.remove("blur-when-expanded");
    }
    
    // Hide the overlay
    if (expandOverlay) {
      expandOverlay.classList.remove("visible");
    }
  }
}

// Close expanded card when clicking on overlay
if (expandOverlay) {
  expandOverlay.addEventListener("click", () => {
    if (expandedCardId) {
      const card = cardElementsById.get(expandedCardId);
      if (card) {
        toggleCardExpand(card, false);
      }
    }
  });
}

/* ==========================================================================
   POINTS EDIT MODAL
   ========================================================================== */
let pointsModalChildId = null;

function openPointsModal(id, data) {
  pointsModalChildId = id;
  
  // Update modal content
  if (pointsModalName) pointsModalName.textContent = data.name || "Unnamed";
  if (pointsModalGrade) pointsModalGrade.textContent = data.grade || "No grade set";
  
  const points = data.points || 0;
  const tier = getTier(points);
  const progress = getRingProgress(points, tier);
  
  if (pointsModalRank) {
    pointsModalRank.textContent = tier.name;
  }
  
  if (pointsModalValue) {
    pointsModalValue.textContent = points;
  }
  
  if (pointsModalAvatarInitials) {
    pointsModalAvatarInitials.textContent = getInitials(data.name || "?");
  }
  
  if (pointsModalRankBadge) {
    pointsModalRankBadge.textContent = tier.emoji;
    pointsModalRankBadge.title = tier.name;
  }
  
  if (pointsModalRingFill) {
    pointsModalRingFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
    pointsModalRingFill.style.stroke = tier.color;
  }
  
  // Show the modal (backdrop-filter on overlay handles the blur)
  if (pointsModalOverlay) {
    pointsModalOverlay.classList.remove("hidden");
  }
}

function closePointsModal() {
  pointsModalChildId = null;
  if (pointsModalOverlay) {
    pointsModalOverlay.classList.add("hidden");
  }
}

// Points modal event handlers
if (closePointsModalBtn) {
  closePointsModalBtn.addEventListener("click", closePointsModal);
}

if (pointsModalOverlay) {
  pointsModalOverlay.addEventListener("click", (event) => {
    if (event.target === pointsModalOverlay) closePointsModal();
  });
}

// Points modal point buttons
if (pointsModalOverlay) {
  pointsModalOverlay.addEventListener("click", (event) => {
    const pointButton = event.target.closest(".btn-point:not(.btn-point--custom)");
    if (pointButton && pointsModalChildId) {
      const amount = Number(pointButton.dataset.amount);
      const action = pointButton.dataset.action || "add";
      updateChildPoints(pointsModalChildId, amount, action);
    }
  });
  
  pointsModalOverlay.addEventListener("submit", (event) => {
    const form = event.target.closest(".custom-point-form--large");
    if (!form || !pointsModalChildId) return;
    event.preventDefault();
    
    const input = form.querySelector(".custom-point-input--large");
    const amount = Number(input?.value);
    
    if (!input?.value.trim() || Number.isNaN(amount) || amount === 0) {
      input?.focus();
      return;
    }
    
    updateChildPoints(pointsModalChildId, amount, "add");
    input.value = "";
  });
  
  pointsModalOverlay.addEventListener("click", (event) => {
    const removeCustomBtn = event.target.closest(".btn-point--custom.btn-point--remove");
    if (removeCustomBtn && pointsModalChildId) {
      const form = removeCustomBtn.closest(".custom-point-form--large");
      const input = form?.querySelector(".custom-point-input--large");
      const amount = Number(input?.value);
      
      if (!input?.value.trim() || Number.isNaN(amount) || amount === 0) {
        input?.focus();
        return;
      }
      
      updateChildPoints(pointsModalChildId, amount, "remove");
      input.value = "";
    }
  });
}

/* ==========================================================================
   NOTE ON THE EDIT MODAL'S DATA SOURCE
   --------------------------------------------------------------------------
   To keep this app simple and dependency-free, the edit modal reads a
   child's current name/age/dob straight from the card's dataset (set inside
   applyCardData) rather than keeping a separate full copy of every Firestore
   document in memory.
   ========================================================================== */
