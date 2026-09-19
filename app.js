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
  apiKey: "AIzaSyD4ENSYFjyTA1N5gBleUMVTOJsP2i4EnmU",
  authDomain: "attendance-765b1.firebaseapp.com",
  projectId: "attendance-765b1",
  storageBucket: "attendance-765b1.firebasestorage.app",
  messagingSenderId: "533258210848",
  appId: "1:533258210848:web:7910c1636d4ed3f8573645",
  measurementId: "G-LV64L0Y8SB",
};

// Initialize Firebase with error handling
let app;
let db;
let childrenCollection;

function initializeFirebase() {
  // Explicitly check for the placeholder API key. This is the root of the issue.
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.error("Firebase configuration is missing. Please update app.js");
    const errorEl = document.getElementById("configError");
    if (errorEl) {
      errorEl.classList.remove("hidden");
      const topbarEl = document.querySelector(".topbar");
      if (topbarEl) {
        topbarEl.classList.add("hidden");
      }
      const connectionStatusEl = document.getElementById("connectionStatus");
      if (connectionStatusEl) {
        connectionStatusEl.classList.add("hidden");
      }
    }
    // Stop the initialization process
    return;
  }

  // If the key is not the placeholder, proceed with initialization.
  app = initializeApp(firebaseConfig);
  getAnalytics(app);
  db = getFirestore(app);
  childrenCollection = collection(db, "children");
  console.log("Firebase initialized successfully");
}

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

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
const expandOverlay = document.getElementById("expandOverlay");
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
const pointsModalAvatarInitials = document.querySelector(
  ".avatar-initials--large",
);
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
const fieldFatherFatherConfession = document.getElementById(
  "fieldFatherFatherConfession",
);
const fieldChurch = document.getElementById("fieldChurch");
const fieldMotherName = document.getElementById("fieldMotherName");
const fieldMotherJob = document.getElementById("fieldMotherJob");
const fieldMotherFatherConfession = document.getElementById(
  "fieldMotherFatherConfession",
);
const fieldSiblingsCount = document.getElementById("fieldSiblingsCount");
const fieldSiblingsNames = document.getElementById("fieldSiblingsNames");
const fieldSiblingsDob = document.getElementById("fieldSiblingsDob");
const fieldNotes = document.getElementById("fieldNotes");

// Search
const searchInput = document.getElementById("searchInput");

const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// Export modal elements
const exportModalOverlay = document.getElementById("exportModalOverlay");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportXlsxBtn = document.getElementById("exportXlsxBtn");
const cancelExportBtn = document.getElementById("cancelExportBtn");

// Grade action buttons (upgrade + export live here, import is always visible)
const gradeActionsContainer = document.getElementById("gradeActionsContainer");
const gradeUpgradeBtn = document.getElementById("gradeUpgradeBtn");
const gradeExportBtn = document.getElementById("gradeExportBtn");
const importBtn = document.getElementById("importBtn");

// Upgrade (promote a whole grade) modal elements
const upgradeModalOverlay = document.getElementById("upgradeModalOverlay");
const upgradeModalText = document.getElementById("upgradeModalText");
const upgradeResetPointsField = document.getElementById("upgradeResetPoints");
const cancelUpgradeBtn = document.getElementById("cancelUpgradeBtn");
const confirmUpgradeBtn = document.getElementById("confirmUpgradeBtn");

// Import modal elements
const importModalOverlay = document.getElementById("importModalOverlay");
const importFileInput = document.getElementById("importFileInput");
const importGradeSelect = document.getElementById("importGradeSelect");
const importStatusEl = document.getElementById("importStatus");
const cancelImportBtn = document.getElementById("cancelImportBtn");

const connectionStatus = document.getElementById("connectionStatus");
const connectionStatusText = document.getElementById("connectionStatusText");

const toastEl = document.getElementById("toast");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const THEME_STORAGE_KEY = "star-trackers-theme";
const LANGUAGE_STORAGE_KEY = "star-trackers-language";

// Translation object
const translations = {
  en: {
    // Header
    brandTitle: "St.George Church",
    brandSubtitle: "Attendance & reward board",
    // Buttons
    darkMode: "Dark mode",
    lightMode: "Light mode",
    addChild: "Add child",
    saveChild: "Save child",
    saveChanges: "Save changes",
    cancel: "Cancel",
    delete: "Delete",
    // Grade filters
    all: "All",
    fourth: "4th",
    fifth: "5th",
    sixth: "6th",
    // Empty state
    noStars: "No stars on the board yet",
    addFirstChild:
      "Add your first child to start tracking attendance and rewards.",
    addChildBtn: "+ Add a child",
    // Modal
    addChildTitle: "Add a child",
    editTitle: "Edit",
    // Fields
    name: "Name",
    dateOfBirth: "Date of birth",
    grade: "Grade",
    address: "Address",
    phoneNumber: "Phone number",
    mothersPhone: "Mother's phone number (if no phone)",
    schoolName: "School name",
    talent: "Talent or sport",
    fathersConfession: "Father's confession",
    inScout: "In scout",
    fathersJob: "Father's job",
    fathersPhone: "Father's phone",
    fathersFathersConfession: "Father's father's confession",
    church: "Church",
    mothersName: "Mother's full name",
    mothersJob: "Mother's job",
    mothersFathersConfession: "Mother's father's confession",
    siblingsCount: "Number of brothers/sisters",
    siblingsNames: "Names of brothers/sisters",
    siblingsDob: "Date of birth of brothers/sisters",
    notes: "Important notes",
    // Details
    addressLabel: "Address:",
    phoneLabel: "Phone:",
    schoolLabel: "School:",
    talentLabel: "Talent/Sport:",
    fathersConfessionLabel: "Father's confession:",
    inScoutLabel: "In Scout:",
    fathersJobLabel: "Father's job:",
    fathersPhoneLabel: "Father's phone:",
    fathersFathersConfessionLabel: "Father's father's confession:",
    churchLabel: "Church:",
    mothersNameLabel: "Mother's name:",
    mothersPhoneLabel: "Mother's phone:",
    mothersJobLabel: "Mother's job:",
    mothersFathersConfessionLabel: "Mother's father's confession:",
    siblingsLabel: "Siblings:",
    notesLabel: "Notes:",
    // Other
    showDetails: "Show details",
    hideDetails: "Hide details",
    export: "Export",
    searchPlaceholder: "Search children...",
    noGrade: "No grade set",
    noChildren: "No children found in",
    exported: "children to file",
    // Points
    points: "points",
    customAmount: "Custom amount",
    add: "Add",
    remove: "Remove",
    // Delete modal
    removeChild: "Remove this child?",
    deleteWarning: "This will permanently delete their record and points.",
    // Yes/No
    yes: "Yes",
    no: "No",
    selectGrade: "Select grade",
    exportGrade: "Export Grade",
    exportFormat: "Choose the export format for the selected grade.",
    // Grade upgrade
    upgrade: "Upgrade",
    upgradeTitle: "Upgrade Grade",
    upgradeResetPoints: "Also reset their points to 0",
    confirmUpgrade: "Upgrade",
    upgradeMessage:
      "This will move {count} children from {from} to {to}. Their details and points stay the same.",
    upgradeNone: "This grade can't be upgraded any further.",
    upgradeEmpty: "There are no children in this grade yet.",
    upgradeError: "Couldn't upgrade every child — please try again.",
    upgraded: "children moved to",
    // Import
    importFile: "Import",
    importTitle: "Import children",
    importHint:
      "Choose a PDF, Excel or CSV file. Columns are matched automatically (name, grade, date of birth, ...) and every child is sorted into the right grade for you.",
    importFileLabel: "File (PDF / Excel / CSV)",
    importGradeLabel: "Grade to use when the file has none",
    importGradeNone: "Keep the grade from the file",
    importReading: "Reading the file…",
    importImporting: "Saving children…",
    importNoRows:
      "No children were found in that file. Check that the first row holds the column names.",
    importError:
      "Couldn't read that file. Please try an Excel/CSV file or another PDF.",
    importDone: "children imported",
    importSkipped: "already on the board and skipped",
    importFailed: "couldn't be saved",
    importUnknown: "children saved without a grade",
    close: "Close",
  },
  ar: {
    // Header
    brandTitle: "كنيسة مارجرجس",
    brandSubtitle: "لوحة الحضور والجوائز",
    // Buttons
    darkMode: "الوضع الداكن",
    lightMode: "الوضع المضيء",
    addChild: "إضافة طفل",
    saveChild: "حفظ الطفل",
    saveChanges: "حفظ التغييرات",
    cancel: "إلغاء",
    delete: "حذف",
    // Grade filters
    all: "الكل",
    fourth: "الصف 4",
    fifth: "الصف 5",
    sixth: "الصف 6",
    // Empty state
    noStars: "لا توجد نجوم على اللوحة بعد",
    addFirstChild: "أضف طفلك الأول لبدء تتبع الحضور والجوائز.",
    addChildBtn: "+ إضافة طفل",
    // Modal
    addChildTitle: "إضافة طفل",
    editTitle: "تعديل",
    // Fields
    name: "الاسم",
    dateOfBirth: "تاريخ الميلاد",
    grade: "الصف",
    address: "العنوان",
    phoneNumber: "رقم الهاتف",
    mothersPhone: "هاتف الأم (إذا لم يكن هناك هاتف)",
    schoolName: "اسم المدرسة",
    talent: "الموهب أو الرياضة",
    fathersConfession: "اعتراف الأب",
    inScout: "في الكشافة",
    fathersJob: "وظيفة الأب",
    fathersPhone: "هاتف الأب",
    fathersFathersConfession: "اعتراف أب الأب",
    church: "الكنيسة",
    mothersName: "اسم الأم الكامل",
    mothersJob: "وظيفة الأم",
    mothersFathersConfession: "اعتراف جد الأم",
    siblingsCount: "عدد الأخواء",
    siblingsNames: "أسماء الأخواء",
    siblingsDob: "تاريخ ميلاد الأخواء",
    notes: "ملاحظات مهمة",
    // Details
    addressLabel: "العنوان:",
    phoneLabel: "الهاتف:",
    schoolLabel: "المدرسة:",
    talentLabel: "الموهب/الرياضة:",
    fathersConfessionLabel: "اعتراف الأب:",
    inScoutLabel: "في الكشافة:",
    fathersJobLabel: "وظيفة الأب:",
    fathersPhoneLabel: "هاتف الأب:",
    fathersFathersConfessionLabel: "اعتراف أب الأب:",
    churchLabel: "الكنيسة:",
    mothersNameLabel: "اسم الأم:",
    mothersPhoneLabel: "هاتف الأم:",
    mothersJobLabel: "وظيفة الأم:",
    mothersFathersConfessionLabel: "اعتراف جد الأم:",
    siblingsLabel: "الأخواء:",
    notesLabel: "الملاحظات:",
    // Other
    showDetails: "إظهار التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    export: "تصدير",
    searchPlaceholder: "بحث عن الأطفال...",
    noGrade: "لا يوجد صف",
    noChildren: "لا يوجد أطفال في",
    exported: "طفل تم تصديرهم",
    // Points
    points: "نقطة",
    customAmount: "مبلغ مخصص",
    add: "إضافة",
    remove: "إزالة",
    // Delete modal
    removeChild: "حذف هذا الطفل؟",
    deleteWarning: "سيتم حذف سجله ونقاطه بشكل دائم.",
    // Yes/No
    yes: "نعم",
    no: "لا",
    selectGrade: "اختر الصف",
    exportGrade: "تصدير الصف",
    exportFormat: "اختر تنسيق التصدير للصف المحدد.",
    // Grade upgrade
    upgrade: "ترقية",
    upgradeTitle: "ترقية الصف",
    upgradeResetPoints: "مع تصفير نقاطهم",
    confirmUpgrade: "ترقية",
    upgradeMessage:
      "سيتم نقل {count} طفل من {from} إلى {to}. ستبقى بياناتهم ونقاطهم كما هي.",
    upgradeNone: "لا يمكن ترقية هذا الصف أكثر من ذلك.",
    upgradeEmpty: "لا يوجد أطفال في هذا الصف بعد.",
    upgradeError: "لم يتم ترقية كل الأطفال — حاول مرة أخرى.",
    upgraded: "طفل تم نقلهم إلى",
    // Import
    importFile: "استيراد",
    importTitle: "استيراد الأطفال",
    importHint:
      "اختر ملف PDF أو Excel أو CSV. يتم التعرف على الأعمدة تلقائيًا (الاسم، الصف، تاريخ الميلاد...) ويتم توزيع كل طفل على صفه تلقائيًا.",
    importFileLabel: "الملف (PDF / Excel / CSV)",
    importGradeLabel: "الصف المستخدم عند عدم وجود صف في الملف",
    importGradeNone: "الاحتفاظ بالصف الموجود في الملف",
    importReading: "جاري قراءة الملف…",
    importImporting: "جاري حفظ الأطفال…",
    importNoRows:
      "لم يتم العثور على أطفال في هذا الملف. تأكد أن الصف الأول يحتوي على أسماء الأعمدة.",
    importError: "لم نتمكن من قراءة هذا الملف. جرّب ملف Excel/CSV أو ملف PDF آخر.",
    importDone: "طفل تم استيرادهم",
    importSkipped: "موجودون بالفعل وتم تخطيهم",
    importFailed: "لم يتم حفظهم",
    importUnknown: "طفل تم حفظهم بدون صف",
    close: "إغلاق",
  },
};

let currentLanguage = "en";

function applyLanguage(lang) {
  currentLanguage = lang;
  document.body.classList.toggle("arabic", lang === "ar");
  document.body.lang = lang;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

  // Update language toggle button
  const langToggleBtn = document.getElementById("languageToggleBtn");
  if (langToggleBtn) {
    const label = langToggleBtn.querySelector(".language-toggle__label");
    if (label) label.textContent = lang === "en" ? "AR" : "EN";
  }

  // Update all translatable elements
  updateTranslations();
}

function updateTranslations() {
  const t = translations[currentLanguage];
  if (!t) return;

  // Update elements with data-translate-key
  document.querySelectorAll("[data-translate-key]").forEach((el) => {
    const key = el.dataset.translateKey;
    if (t[key]) {
      el.textContent = t[key];
    }
    const placeholderKey = el.dataset.translatePlaceholder;
    if (placeholderKey && t[placeholderKey]) {
      el.placeholder = t[placeholderKey];
    }
  });

  // Update dynamic elements
  if (modalTitle) {
    if (editingChildId) {
      modalTitle.textContent = `${t.editTitle} ${fieldName.value || ""}`;
    }
  }
  if (saveChildBtn) {
    const saveChildSpan = saveChildBtn.querySelector("span");
    if (saveChildSpan) {
      saveChildSpan.textContent = editingChildId ? t.saveChanges : t.saveChild;
    }
  }
  if (searchInput) {
    searchInput.placeholder = t.searchPlaceholder;
  }
  const gradeOptions = document.querySelector("#fieldGrade option");
  if (gradeOptions) {
    gradeOptions.textContent = t.selectGrade;
  }
}

function initLanguage() {
  const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  applyLanguage(savedLang || "en");
}

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
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initLanguage();

  // Set a timeout to show error if connection takes too long
  let connectionTimeout = setTimeout(() => {
    if (!connectionStatus.classList.contains("is-live")) {
      setConnectionStatus("error");
    }
  }, 10000); // 10 seconds timeout

  try {
    initializeFirebase();
    // Start listener only if initialization was successful
    if (db) {
      startFirestoreListener();
    } else {
      // If db is not initialized (due to config error), clear the timeout
      clearTimeout(connectionTimeout);
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
    setConnectionStatus("error", `Firebase init failed: ${error.message}`);
    clearTimeout(connectionTimeout);
  }

  // Theme toggle event handler
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark")
        ? "light"
        : "dark";
      applyTheme(nextTheme);
    });
  }

  // Language toggle event handler
  const languageToggleBtn = document.getElementById("languageToggleBtn");
  if (languageToggleBtn) {
    languageToggleBtn.addEventListener("click", () => {
      const nextLang = currentLanguage === "en" ? "ar" : "en";
      applyLanguage(nextLang);
    });
  }

  // Grade filter event handlers
  const gradeFilterButtons = document.querySelectorAll(".grade-filter-btn");

  gradeFilterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active state
      gradeFilterButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      // Set the filter
      gradeFilter = btn.dataset.grade;

      // Show the grade action buttons only for a specific grade (not "all")
      updateGradeActionsVisibility();

      // Apply filters
      filterChildren();
    });
  });

  // Set "All" as active by default
  const allFilterBtn = document.querySelector(
    '.grade-filter-btn[data-grade="all"]',
  );
  if (allFilterBtn) {
    allFilterBtn.classList.add("is-active");
  }

  // Make sure the action buttons match the grade selected on load
  updateGradeActionsVisibility();

  // Grade export button event handler
  if (gradeExportBtn) {
    gradeExportBtn.addEventListener("click", () => {
      const grade = gradeExportBtn.dataset.grade || gradeFilter;
      openExportModal(grade);
    });
  }

  // Grade upgrade button event handler: 4th -> 5th, 5th -> 6th (6th has none)
  if (gradeUpgradeBtn) {
    gradeUpgradeBtn.addEventListener("click", () =>
      openUpgradeModal(gradeFilter),
    );
  }

  // Import button event handler
  if (importBtn) {
    importBtn.addEventListener("click", openImportModal);
  }

  // Add child button event handlers
  if (openAddModalBtn) {
    openAddModalBtn.addEventListener("click", openAddModal);
  }
  if (emptyStateAddBtn) {
    emptyStateAddBtn.addEventListener("click", openAddModal);
  }

  // Modal event handlers
  if (cancelModalBtn) {
    cancelModalBtn.addEventListener("click", closeChildModal);
  }
  if (childModalOverlay) {
    childModalOverlay.addEventListener("click", (event) => {
      if (event.target === childModalOverlay) closeChildModal();
    });
  }

  // Delete modal event handlers
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  }
  if (deleteModalOverlay) {
    deleteModalOverlay.addEventListener("click", (event) => {
      if (event.target === deleteModalOverlay) closeDeleteModal();
    });
  }
  if (confirmDeleteBtn) {
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
  }

  // Form submit handler
  if (childForm) {
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
        formError.textContent =
          "Please fill in a valid name and date of birth.";
        formError.classList.remove("hidden");
        return;
      }

      saveChildBtn.disabled = true;
      try {
        if (editingChildId) {
          // Editing an existing child: keep their points untouched, update the rest
          await updateDoc(doc(db, "children", editingChildId), {
            name,
            dob,
            grade,
            address,
            phone,
            motherPhone,
            school,
            talent,
            fatherConfession,
            inScout,
            fatherJob,
            fatherPhone,
            fatherFatherConfession,
            church,
            motherName,
            motherJob,
            motherFatherConfession,
            siblingsCount,
            siblingsNames,
            siblingsDob,
            notes,
          });
          showToast(`${name}'s details were updated`);
        } else {
          // Adding a brand-new child, starting at 0 points
          await addDoc(childrenCollection, {
            name,
            dob,
            grade,
            address,
            phone,
            motherPhone,
            school,
            talent,
            fatherConfession,
            inScout,
            fatherJob,
            fatherPhone,
            fatherFatherConfession,
            church,
            motherName,
            motherJob,
            motherFatherConfession,
            siblingsCount,
            siblingsNames,
            siblingsDob,
            notes,
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
  }

  // Card click event delegation
  if (childGrid) {
    // Event listeners are now attached directly to card elements in buildCardElement
  }
});

// Async function to update child points
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

// Firestore real-time listener
function startFirestoreListener() {
  console.log("Starting Firestore listener...");

  // Check if Firebase is initialized
  if (!db || !childrenCollection) {
    console.error("Firebase not initialized - check your config");
    setConnectionStatus("error");
    showToast("Firebase not configured. Check app.js for errors.");
    return;
  }

  onSnapshot(
    childrenCollection,
    (snapshot) => {
      console.log("Firestore connected successfully!");
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
      showToast("Connection failed. Check Firebase config and database rules.");
    },
  );
}

// Export Modal
function openExportModal(grade) {
  exportPdfBtn.dataset.grade = grade;
  exportXlsxBtn.dataset.grade = grade;
  exportModalOverlay.classList.remove("hidden");
  document.body.classList.add("modal-open");
  updateTranslations(); // Translate the modal
}

function closeExportModal() {
  exportModalOverlay.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

if (cancelExportBtn) {
  cancelExportBtn.addEventListener("click", closeExportModal);
}
if (exportModalOverlay) {
  exportModalOverlay.addEventListener(
    "click",
    (e) => e.target === exportModalOverlay && closeExportModal(),
  );
}

// PDF export function
function exportGradeToPDF(grade) {
  // Get all cards for this grade
  const cards = Array.from(cardElementsById.values()).filter(
    (card) => card.dataset.grade === grade,
  );

  if (cards.length === 0) {
    showToast(`No children found in ${grade}`);
    return;
  }

  // Create HTML table for PDF export
  const t = translations[currentLanguage];
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${t.export} - ${grade}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; direction: ${currentLanguage === "ar" ? "rtl" : "ltr"}; }
        h1 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: ${currentLanguage === "ar" ? "right" : "left"}; }
        th { background-color: #4ecdc4; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .header { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>${t.export} - ${grade}</h1>
      <table>
        <thead>
          <tr>
            <th>${t.name}</th>
            <th>${t.grade}</th>
            <th>${t.points}</th>
            <th>${t.address}</th>
            <th>${t.phoneNumber}</th>
            <th>${t.mothersPhone}</th>
            <th>${t.schoolName}</th>
            <th>${t.talent}</th>
            <th>${t.fathersConfession}</th>
            <th>${t.inScout}</th>
            <th>${t.fathersJob}</th>
            <th>${t.fathersPhone}</th>
            <th>${t.church}</th>
            <th>${t.mothersName}</th>
            <th>${t.mothersJob}</th>
            <th>${t.siblingsCount}</th>
            <th>${t.notes}</th>
          </tr>
        </thead>
        <tbody>
  `;

  cards.forEach((card) => {
    const name = card.dataset.name || "";
    const grade = card.dataset.grade || "";
    const points = card.querySelector(".points-number")?.textContent || "0";
    const address = card.dataset.address || "";
    const phone = card.dataset.phone || "";
    const motherPhone = card.dataset.motherPhone || "";
    const school = card.dataset.school || "";
    const talent = card.dataset.talent || "";
    const fatherConfession = card.dataset.fatherConfession || "";
    const inScout = card.dataset.inScout || "";
    const fatherJob = card.dataset.fatherJob || "";
    const fatherPhone = card.dataset.fatherPhone || "";
    const church = card.dataset.church || "";
    const motherName = card.dataset.motherName || "";
    const motherJob = card.dataset.motherJob || "";
    const siblingsCount = card.dataset.siblingsCount || "";
    const notes = card.dataset.notes || "";

    htmlContent += `
      <tr>
        <td>${name}</td>
        <td>${grade}</td>
        <td>${points}</td>
        <td>${address}</td>
        <td>${phone}</td>
        <td>${motherPhone}</td>
        <td>${school}</td>
        <td>${talent}</td>
        <td>${fatherConfession}</td>
        <td>${inScout}</td>
        <td>${fatherJob}</td>
        <td>${fatherPhone}</td>
        <td>${church}</td>
        <td>${motherName}</td>
        <td>${motherJob}</td>
        <td>${siblingsCount}</td>
        <td>${notes}</td>
      </tr>
    `;
  });

  htmlContent += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Create a new window and print it as PDF
  const printWindow = window.open("", "_blank");
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  // Trigger print dialog after a short delay
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);

  showToast(
    `${translations[currentLanguage].exported} ${cards.length} children to PDF...`,
  );
  closeExportModal();
}

// Excel export function
function exportGradeToXLSX(grade) {
  const cards = Array.from(cardElementsById.values()).filter(
    (card) => card.dataset.grade === grade,
  );

  if (cards.length === 0) {
    showToast(`${translations[currentLanguage].noChildren} ${grade}`);
    return;
  }

  const t = translations[currentLanguage];
  const headers = [
    t.name,
    t.grade,
    t.points,
    t.address,
    t.phoneNumber,
    t.mothersPhone,
    t.schoolName,
    t.talent,
    t.fathersConfession,
    t.inScout,
    t.fathersJob,
    t.fathersPhone,
    t.church,
    t.mothersName,
    t.mothersJob,
    t.siblingsCount,
    t.notes,
  ];

  const data = cards.map((card) => {
    const name = card.dataset.name || "";
    const grade = card.dataset.grade || "";
    const points = card.querySelector(".points-number")?.textContent || "0";
    const address = card.dataset.address || "";
    const phone = card.dataset.phone || "";
    const motherPhone = card.dataset.motherPhone || "";
    const school = card.dataset.school || "";
    const talent = card.dataset.talent || "";
    const fatherConfession = card.dataset.fatherConfession || "";
    const inScout = card.dataset.inScout || "";
    const fatherJob = card.dataset.fatherJob || "";
    const fatherPhone = card.dataset.fatherPhone || "";
    const church = card.dataset.church || "";
    const motherName = card.dataset.motherName || "";
    const motherJob = card.dataset.motherJob || "";
    const siblingsCount = card.dataset.siblingsCount || "";
    const notes = card.dataset.notes || "";
    return [
      name,
      grade,
      points,
      address,
      phone,
      motherPhone,
      school,
      talent,
      fatherConfession,
      inScout,
      fatherJob,
      fatherPhone,
      church,
      motherName,
      motherJob,
      siblingsCount,
      notes,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, grade);

  // Trigger download
  XLSX.writeFile(workbook, `StGeorge_Attendance_${grade}.xlsx`);

  showToast(
    `${translations[currentLanguage].exported} ${cards.length} children to Excel...`,
  );
  closeExportModal();
}

if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", (e) =>
    exportGradeToPDF(e.target.dataset.grade),
  );
}
if (exportXlsxBtn) {
  exportXlsxBtn.addEventListener("click", (e) =>
    exportGradeToXLSX(e.target.dataset.grade),
  );
}

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
    const matchesQuery =
      name.includes(query) ||
      grade.includes(query) ||
      school.includes(query) ||
      talent.includes(query);

    // Check grade filter match
    const matchesGrade =
      gradeFilter === "all" || card.dataset.grade === gradeFilter;

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

  // Attach event listeners directly to the card's interactive elements
  const expandBtn = card.querySelector(".expand-btn");
  const collapseBtn = card.querySelector(".collapse-btn");
  const editBtn = card.querySelector(".edit-btn");
  const deleteBtn = card.querySelector(".delete-btn");
  const pointsDisplay = card.querySelector(".points-display");
  const quickPointButtons = card.querySelectorAll(
    ".btn-point:not(.btn-point--custom)",
  );
  const customPointForm = card.querySelector(".custom-point-form");
  const customRemoveBtn = card.querySelector(
    ".btn-point--custom.btn-point--remove",
  );

  if (expandBtn) {
    expandBtn.addEventListener("click", () => toggleCardExpand(card, true));
  }
  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => toggleCardExpand(card, false));
  }
  if (editBtn) {
    editBtn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent card expansion if edit button is clicked
      const childData = { ...card.dataset };
      openEditModal(id, childData);
    });
  }
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent card expansion if delete button is clicked
      const name = card.querySelector(".child-name").textContent;
      openDeleteModal(id, name);
    });
  }
  if (pointsDisplay) {
    pointsDisplay.addEventListener("click", () => {
      // Toggle the visibility of the point controls on the card
      card.classList.toggle("is-points-active");
    });
  }

  quickPointButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent other card actions
      const amount = Number(button.dataset.amount);
      const action = button.dataset.action || "add";
      updateChildPoints(id, amount, action);
    });
  });

  if (customPointForm) {
    customPointForm.addEventListener("submit", (event) =>
      handleCustomPointSubmit(event, card),
    );
  }

  if (customRemoveBtn) {
    customRemoveBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const form = customRemoveBtn.closest(".custom-point-form");
      if (!form) return;
      const input = form.querySelector(".custom-point-input");
      if (!input) return;

      const amount = Number(input.value);
      if (!input.value.trim() || Number.isNaN(amount) || amount === 0) {
        input.focus();
        return;
      }

      updateChildPoints(id, amount, "remove");
      input.value = "";
    });
  }

  applyCardData(card, data, { isNew: true });
  // Apply translations to the new card
  updateTranslations();

  return card;
}

function applyCardData(card, data, { isNew = false } = {}) {
  const points = data.points || 0;
  const tier = getTier(points);
  const progress = getRingProgress(points, tier);

  // Stash the raw field values on the card's dataset so the edit modal can
  // read them back exactly, without needing a second Firestore lookup.
  card.dataset.name = data.name || "";
  // Store all data on the dataset for the edit modal
  for (const key in data) {
    // Do not overwrite the points value during a general data update
    // The points are handled separately for animation.
    if (key === "points") continue;
    // Avoid storing objects or functions, only primitives
    if (
      typeof data[key] === "string" ||
      typeof data[key] === "number" ||
      typeof data[key] === "boolean"
    ) {
      card.dataset[key] = String(data[key]);
    }
  }

  card.querySelector(".avatar-initials").textContent = getInitials(
    data.name || "?",
  );
  // Update all .child-name elements (both collapsed and expanded views)
  card.querySelector(".child-name").textContent = data.name || "Unnamed";
  // Update all .child-grade elements (both collapsed and expanded views)
  const age = calculateAge(data.dob);
  card.querySelector(".child-grade").textContent = data.grade || "No grade set";
  // Update all .child-meta elements (both collapsed and expanded views)
  card.querySelector(".child-meta").textContent =
    `Age ${age ?? "?"} · Born ${formatDob(data.dob)}`;
  // Update all .rank-name elements (both collapsed and expanded views)
  card.querySelector(".rank-name").textContent = tier.name;

  // Update detail values
  card.querySelector(".child-address").textContent = data.address || "—";
  card.querySelector(".child-phone").textContent =
    data.phone || data.motherPhone || "—";
  card.querySelector(".child-school").textContent = data.school || "—";
  card.querySelector(".child-talent").textContent = data.talent || "—";
  card.querySelector(".child-father-confession").textContent =
    data.fatherConfession || "—";
  card.querySelector(".child-in-scout").textContent = data.inScout || "—";
  card.querySelector(".child-father-job").textContent = data.fatherJob || "—";
  card.querySelector(".child-father-phone").textContent =
    data.fatherPhone || "—";
  card.querySelector(".child-father-father-confession").textContent =
    data.fatherFatherConfession === "yes" ? "Yes" : "No";
  card.querySelector(".child-church").textContent = data.church || "—";
  card.querySelector(".child-mother-name").textContent = data.motherName || "—";
  card.querySelector(".child-mother-phone").textContent =
    data.motherPhone || "—";
  card.querySelector(".child-mother-job").textContent = data.motherJob || "—";
  card.querySelector(".child-mother-father-confession").textContent =
    data.motherFatherConfession || "—";

  // Format siblings info
  let siblingsText = "—";
  if (data.siblingsCount && data.siblingsCount > 0) {
    const names = data.siblingsNames
      ? data.siblingsNames.split("\n").filter((n) => n.trim())
      : [];
    const dobs = data.siblingsDob
      ? data.siblingsDob.split("\n").filter((d) => d.trim())
      : [];
    siblingsText = `${data.siblingsCount} sibling${data.siblingsCount > 1 ? "s" : ""}`;
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
  const previousPoints = lastKnownPointsById.get(card.dataset.id) ?? 0;

  if (isNew) {
    pointsNumberEl.textContent = points;
  } else if (previousPoints !== points) {
    // Animate all points number elements
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
  cards.forEach((card) => childGrid.appendChild(card));
}

function setConnectionStatus(state, message = "") {
  connectionStatus.classList.remove("is-live", "is-error");
  if (state === "live") {
    connectionStatus.classList.add("is-live");
    connectionStatusText.textContent = "Live — syncing across all your devices";
  } else if (state === "error") {
    connectionStatus.classList.add("is-error");
    connectionStatusText.textContent =
      message || "Couldn't connect — check your Firebase config";
  } else {
    connectionStatusText.textContent = "Connecting to live sync…";
  }
}

/* ==========================================================================
   ADD / EDIT MODAL
   ========================================================================== */
function openAddModal() {
  editingChildId = null;
  if (modalTitle) {
    modalTitle.textContent = translations[currentLanguage].addChildTitle;
  }
  if (saveChildBtn) {
    const saveChildSpan = saveChildBtn.querySelector("span");
    if (saveChildSpan)
      saveChildSpan.textContent = translations[currentLanguage].saveChild;
  }
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
  if (modalTitle) {
    modalTitle.textContent = `${translations[currentLanguage].editTitle} ${data.name}`;
  }
  if (saveChildBtn) {
    const saveChildSpan = saveChildBtn.querySelector("span");
    if (saveChildSpan)
      saveChildSpan.textContent = translations[currentLanguage].saveChanges;
  }
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

/* ==========================================================================
   EVENT DELEGATION FOR CARD BUTTONS
   Instead of attaching listeners to every single card (which we'd have to
   redo every time a card is created), we listen once on the grid container
   and figure out which card + button was clicked.
   ========================================================================== */
if (expandOverlay) {
  expandOverlay.addEventListener("click", () => {
    if (expandedCardId)
      toggleCardExpand(cardElementsById.get(expandedCardId), false);
  });
}

function handleCustomPointSubmit(event, card) {
  event.preventDefault();
  const id = card.dataset.id;
  const form = event.target.closest(".custom-point-form");
  if (!form) return;

  const input = form.querySelector(".custom-point-input");
  if (!input) return;

  const amount = Number(input.value);
  if (!input.value.trim() || Number.isNaN(amount) || amount === 0) {
    input.focus();
    return;
  }

  updateChildPoints(id, amount, "add");
  input.value = "";
}

/* ==========================================================================
   COLLAPSIBLE CARD LOGIC
   ========================================================================== */
// Track the currently expanded card
let expandedCardId = null;

function toggleCardExpand(card, shouldExpand) {
  const id = card.dataset.id;
  const expandBtn = card.querySelector(".expand-btn");
  const collapseBtn = card.querySelector(".collapse-btn");

  if (shouldExpand) {
    // If another card is expanded, collapse it first
    if (expandedCardId && expandedCardId !== id) {
      const previousCard = cardElementsById.get(expandedCardId);
      if (previousCard) toggleCardExpand(previousCard, false);
    }

    const rect = card.getBoundingClientRect();
    card.style.setProperty("--origin-x", `${rect.left}px`);
    card.style.setProperty("--origin-y", `${rect.top}px`);
    card.style.setProperty("--origin-w", `${rect.width}px`);
    card.style.setProperty("--origin-h", `${rect.height}px`);

    card.classList.add("is-expanded");
    expandOverlay.classList.remove("hidden");
    document.body.classList.add("modal-open");

    if (expandBtn) expandBtn.style.display = "none";
    if (collapseBtn) collapseBtn.style.display = "block";
    expandedCardId = id;
  } else {
    // Add a class to trigger the collapse animation
    card.classList.add("is-collapsing");
    card.classList.remove("is-expanded"); // This removes the fixed positioning styles
    expandOverlay.classList.add("hidden");
    document.body.classList.remove("modal-open");

    // Use a timeout to allow the exit animation to complete before resetting styles
    setTimeout(() => {
      card.classList.remove("is-collapsing");

      if (expandBtn) expandBtn.style.display = "block";
      if (collapseBtn) collapseBtn.style.display = "none";

      // Clean up inline styles after animation
      card.style.removeProperty("--origin-x");
      card.style.removeProperty("--origin-y");
      card.style.removeProperty("--origin-w");
      card.style.removeProperty("--origin-h");
    }, 400); // Matches the transition duration in CSS

    if (expandedCardId === id) {
      expandedCardId = null;
    }
  }
}

/* ==========================================================================
   POINTS EDIT MODAL
   ========================================================================== */
let pointsModalChildId = null;

function openPointsModal(id, data) {
  pointsModalChildId = id;

  // Update modal content
  if (pointsModalName) pointsModalName.textContent = data.name || "Unnamed";
  if (pointsModalGrade)
    pointsModalGrade.textContent = data.grade || "No grade set";

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
    pointsModalRingFill.style.strokeDashoffset = String(
      RING_CIRCUMFERENCE * (1 - progress),
    );
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
    const pointButton = event.target.closest(
      ".btn-point:not(.btn-point--custom)",
    );
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

    const input = form.querySelector(".custom-point-input--large"); // Null check
    if (!input) return;
    const amount = Number(input.value);

    if (!input.value.trim() || Number.isNaN(amount) || amount === 0) {
      input.focus();
      return;
    }

    updateChildPoints(pointsModalChildId, amount, "add");
    input.value = "";
  });

  pointsModalOverlay.addEventListener("click", (event) => {
    // Duplicated event listener, should be moved outside
    const removeCustomBtn = event.target.closest(
      ".btn-point--custom.btn-point--remove",
    );
    if (removeCustomBtn && pointsModalChildId) {
      const form = removeCustomBtn.closest(".custom-point-form--large");
      if (!form) return; // Null check
      const input = form.querySelector(".custom-point-input--large"); // Null check
      if (!input) return;
      const amount = Number(input.value);

      if (!input.value.trim() || Number.isNaN(amount) || amount === 0) {
        input.focus();
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

/* ==========================================================================
   GRADE ACTIONS (UPGRADE)
   --------------------------------------------------------------------------
   Every grade can be moved up one step: 4th -> 5th and 5th -> 6th. The 6th
   grade is the last one, so it keeps only the Export button (PDF / Excel).
   Import is available for every grade (and for "All").
   ========================================================================== */

// Which grade follows which — 6th grade has no next step on purpose.
const GRADE_PROGRESSION = {
  "4th grade": "5th grade",
  "5th grade": "6th grade",
};

// Localised names for the fixed grades, used inside the upgrade message.
const GRADE_LABELS = {
  "4th grade": { en: "4th grade", ar: "الصف الرابع" },
  "5th grade": { en: "5th grade", ar: "الصف الخامس" },
  "6th grade": { en: "6th grade", ar: "الصف السادس" },
};

function getNextGrade(grade) {
  return GRADE_PROGRESSION[grade] || "";
}

function localizeGrade(grade) {
  const labels = GRADE_LABELS[grade];
  if (!labels) return grade;
  return labels[currentLanguage] || labels.en;
}

function getCardsInGrade(grade) {
  return Array.from(cardElementsById.values()).filter(
    (card) => card.dataset.grade === grade,
  );
}

// Shows the Upgrade button only for grades that can still move up, and keeps
// the Export button pointing at the grade currently on screen.
function updateGradeActionsVisibility() {
  if (!gradeActionsContainer || !gradeExportBtn || !gradeUpgradeBtn) return;

  const isSpecificGrade = gradeFilter !== "all";
  gradeActionsContainer.classList.toggle("hidden", !isSpecificGrade);
  gradeExportBtn.dataset.grade = isSpecificGrade ? gradeFilter : "";

  const nextGrade = getNextGrade(gradeFilter);
  const canUpgrade = isSpecificGrade && Boolean(nextGrade);
  gradeUpgradeBtn.classList.toggle("hidden", !canUpgrade);
  gradeUpgradeBtn.dataset.nextGrade = canUpgrade ? nextGrade : "";
}

// Keeps the filter buttons, the action buttons and the grid in sync.
function setGradeFilter(grade) {
  gradeFilter = grade;
  document.querySelectorAll(".grade-filter-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.grade === grade);
  });
  updateGradeActionsVisibility();
  filterChildren();
}

/* --------------------------- UPGRADE MODAL ------------------------------- */
let upgradingFromGrade = "";
let upgradeInProgress = false;

function openUpgradeModal(fromGrade) {
  const t = translations[currentLanguage];
  const nextGrade = getNextGrade(fromGrade);

  if (!nextGrade) {
    showToast(t.upgradeNone);
    return;
  }

  const count = getCardsInGrade(fromGrade).length;
  if (count === 0) {
    showToast(t.upgradeEmpty);
    return;
  }

  upgradingFromGrade = fromGrade;
  if (upgradeModalText) {
    upgradeModalText.textContent = t.upgradeMessage
      .replace("{count}", String(count))
      .replace("{from}", localizeGrade(fromGrade))
      .replace("{to}", localizeGrade(nextGrade));
  }
  if (upgradeResetPointsField) upgradeResetPointsField.checked = false;
  if (upgradeModalOverlay) {
    upgradeModalOverlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}

function closeUpgradeModal() {
  upgradingFromGrade = "";
  if (upgradeModalOverlay) {
    upgradeModalOverlay.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
}

async function confirmGradeUpgrade() {
  if (upgradeInProgress) return;

  const t = translations[currentLanguage];
  const fromGrade = upgradingFromGrade;
  const nextGrade = getNextGrade(fromGrade);

  if (!fromGrade || !nextGrade) {
    closeUpgradeModal();
    return;
  }

  const cards = getCardsInGrade(fromGrade);
  const resetPoints = Boolean(upgradeResetPointsField?.checked);

  upgradeInProgress = true;
  if (confirmUpgradeBtn) confirmUpgradeBtn.disabled = true;
  let moved = 0;

  try {
    for (const card of cards) {
      const id = card.dataset.id;
      if (!id) continue;

      const update = { grade: nextGrade };
      if (resetPoints) update.points = 0;

      await updateDoc(doc(db, "children", id), update);
      moved += 1;
    }
    showToast(`${moved} ${t.upgraded} ${localizeGrade(nextGrade)} `);
    // Jump to the grade the children just moved into, so they stay in view.
    setGradeFilter(nextGrade);
  } catch (error) {
    console.error("Error upgrading grade:", error);
    showToast(t.upgradeError);
  } finally {
    upgradeInProgress = false;
    if (confirmUpgradeBtn) confirmUpgradeBtn.disabled = false;
    closeUpgradeModal();
  }
}

if (cancelUpgradeBtn) {
  cancelUpgradeBtn.addEventListener("click", closeUpgradeModal);
}
if (upgradeModalOverlay) {
  upgradeModalOverlay.addEventListener("click", (event) => {
    if (event.target === upgradeModalOverlay) closeUpgradeModal();
  });
}
if (confirmUpgradeBtn) {
  confirmUpgradeBtn.addEventListener("click", confirmGradeUpgrade);
}

/* ==========================================================================
   IMPORT CHILDREN (PDF / EXCEL / CSV)
   --------------------------------------------------------------------------
   One Import button (always visible in the topbar) opens a modal. The user
   picks a .xlsx / .xls / .csv / .pdf file, columns are matched automatically
   (English + Arabic headers) and every child is sorted into the right grade.
   Duplicates (same name + dob + grade) are skipped, never duplicated.
   ========================================================================== */

const GRADE_VALUES = ["4th grade", "5th grade", "6th grade"];
let importInProgress = false;

function openImportModal() {
  if (importGradeSelect && gradeFilter && gradeFilter !== "all") {
    importGradeSelect.value = gradeFilter;
  }
  if (importFileInput) importFileInput.value = "";
  setImportStatus("");
  if (importModalOverlay) {
    importModalOverlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}

function closeImportModal() {
  if (importInProgress) return;
  if (importModalOverlay) {
    importModalOverlay.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
  if (importFileInput) importFileInput.value = "";
}

function setImportStatus(message, isError = false) {
  if (!importStatusEl) return;
  importStatusEl.textContent = message || "";
  importStatusEl.classList.toggle("is-error", Boolean(isError && message));
}

function normalizeGradeValue(raw, fallbackGrade) {
  const fallback =
    GRADE_VALUES.includes(fallbackGrade) ? fallbackGrade : "";
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (s.includes("رابع") || s.includes("four") || s === "4" || /(^|[^0-9])4([^0-9]|$)/.test(s))
    return "4th grade";
  if (s.includes("خامس") || s.includes("five") || s.includes("fifth") || s === "5" || /(^|[^0-9])5([^0-9]|$)/.test(s))
    return "5th grade";
  if (s.includes("سادس") || s.includes("six") || s === "6" || /(^|[^0-9])6([^0-9]|$)/.test(s))
    return "6th grade";
  if (GRADE_VALUES.includes(String(raw).trim())) return String(raw).trim();
  return fallback;
}

function normalizeImportHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .replace(/[:"'«»]/g, "");
}

function headerMatches(normalized, keywords) {
  return keywords.some((k) => normalized.includes(k));
}

function buildColumnMap(headerRow) {
  const map = {};
  const used = new Set();
  const pick = (field, keywords) => {
    headerRow.forEach((h, idx) => {
      if (map[field] !== undefined || used.has(idx)) return;
      if (headerMatches(normalizeImportHeader(h), keywords)) {
        map[field] = idx;
        used.add(idx);
      }
    });
  };
  pick("name", ["name", "child name", "full name", "student", "الاسم", "اسم الطفل", "اسم التلميذ"]);
  pick("grade", ["grade", "class", "year", "level", "الصف", "المرحلة", "السنة", "الفصل"]);
  pick("dob", ["dob", "birth", "born", "تاريخ الميلاد", "الميلاد", "مولد"]);
  pick("points", ["point", "score", "النقاط", "نقاط", "الدرجات", "الدرجة"]);
  pick("address", ["address", "العنوان", "السكن"]);
  pick("phone", ["phone", "mobile", "tel", "التليفون", "الهاتف", "الموبايل", "رقم"]);
  pick("motherPhone", ["mother phone", "mother mobile", "تليفون الام", "هاتف الام", "موبايل الام"]);
  pick("school", ["school", "المدرسة"]);
  pick("talent", ["talent", "sport", "hobby", "الموهبة", "الرياضة", "الهواية"]);
  pick("fatherConfession", ["father confession", "confession father", "اعتراف الاب"]);
  pick("inScout", ["scout", "كشافة"]);
  pick("fatherJob", ["father job", "father work", "عمل الاب", "وظيفة الاب", "مهنة الاب"]);
  pick("fatherPhone", ["father phone", "father mobile", "تليفون الاب", "هاتف الاب"]);
  pick("fatherFatherConfession", ["grandfather confession", "father father confession", "اعتراف الجد"]);
  pick("church", ["church", "الكنيسة"]);
  pick("motherName", ["mother name", "اسم الام"]);
  pick("motherJob", ["mother job", "mother work", "عمل الام", "وظيفة الام"]);
  pick("motherFatherConfession", ["mother father confession", "اعتراف جد الام"]);
  pick("siblingsCount", ["sibling count", "siblings count", "brothers", "عدد الاخوة"]);
  pick("siblingsNames", ["sibling name", "siblings name", "اسماء الاخوة"]);
  pick("siblingsDob", ["sibling dob", "siblings birth", "تاريخ ميلاد الاخوة"]);
  pick("notes", ["note", "notes", "comment", "ملاحظات", "ملاحظة"]);
  return map;
}

function looksLikeHeaderRow(row) {
  const joined = row.map((c) => normalizeImportHeader(c)).join(" | ");
  return (
    joined.includes("name") ||
    joined.includes("الاسم") ||
    joined.includes("grade") ||
    joined.includes("الصف") ||
    joined.includes("birth") ||
    joined.includes("الميلاد") ||
    joined.includes("phone") ||
    joined.includes("الهاتف") ||
    joined.includes("school") ||
    joined.includes("المدرسة")
  );
}

function rowToChild(values, columnMap, fallbackGrade) {
  const cell = (field) => {
    const idx = columnMap[field];
    if (idx === undefined) return "";
    const v = values[idx];
    return v === undefined || v === null ? "" : String(v).trim();
  };
  const name = cell("name") || String(values[0] ?? "").trim();
  if (!name) return null;
  let dob = cell("dob");
  const dobMatch = dob.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (dobMatch) dob = `${dobMatch[1]}-${dobMatch[2].padStart(2, "0")}-${dobMatch[3].padStart(2, "0")}`;
  else {
    const dobMatch2 = dob.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (dobMatch2) dob = `${dobMatch2[3]}-${dobMatch2[2].padStart(2, "0")}-${dobMatch2[1].padStart(2, "0")}`;
  }
  const pointsRaw = Number(cell("points"));
  return {
    name,
    dob: /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : "",
    grade: normalizeGradeValue(cell("grade"), fallbackGrade),
    points: Number.isFinite(pointsRaw) && pointsRaw > 0 ? Math.floor(pointsRaw) : 0,
    address: cell("address"),
    phone: cell("phone"),
    motherPhone: cell("motherPhone"),
    school: cell("school"),
    talent: cell("talent"),
    fatherConfession: cell("fatherConfession"),
    inScout: cell("inScout"),
    fatherJob: cell("fatherJob"),
    fatherPhone: cell("fatherPhone"),
    fatherFatherConfession: cell("fatherFatherConfession"),
    church: cell("church"),
    motherName: cell("motherName"),
    motherJob: cell("motherJob"),
    motherFatherConfession: cell("motherFatherConfession"),
    siblingsCount: cell("siblingsCount"),
    siblingsNames: cell("siblingsNames"),
    siblingsDob: cell("siblingsDob"),
    notes: cell("notes"),
  };
}

function matrixToChildren(matrix, fallbackGrade) {
  const rows = (matrix || []).map((r) => (Array.isArray(r) ? r : [r]));
  const nonEmpty = rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (nonEmpty.length === 0) return [];
  let headerIdx = 0;
  let columnMap = buildColumnMap(nonEmpty[0]);
  if (columnMap.name === undefined && !looksLikeHeaderRow(nonEmpty[0])) {
    columnMap = { name: 0 };
    if (nonEmpty.length > 1) {
      const g = buildColumnMap(nonEmpty[0]);
      if (g.grade !== undefined) columnMap.grade = g.grade;
      if (g.dob !== undefined) columnMap.dob = g.dob;
    }
    headerIdx = -1;
  }
  if (columnMap.name === undefined) columnMap.name = 0;
  const out = [];
  for (let i = headerIdx + 1; i < nonEmpty.length; i += 1) {
    const child = rowToChild(nonEmpty[i], columnMap, fallbackGrade);
    if (child) out.push(child);
  }
  return out;
}

function readSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    if (typeof XLSX === "undefined") {
      reject(new Error("XLSX library is not loaded"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        resolve(matrix);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsArrayBuffer(file);
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === ";" || ch === "\t") && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target.result || "").replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
        resolve(lines.map(splitCsvLine));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsText(file, "utf-8");
  });
}

async function readPdfFile(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF library is not loaded");
  }
  try {
    if (!readPdfFile._workerSet && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      readPdfFile._workerSet = true;
    }
  } catch (workerError) {
    console.warn("Could not set PDF worker:", workerError);
  }
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const matrix = [];
  const maxPages = Math.min(pdf.numPages, 30);
  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rowsByY = new Map();
    content.items.forEach((item) => {
      const text = String(item.str || "").trim();
      if (!text) return;
      const y = Math.round(item.transform[5] / 4);
      const x = item.transform[4];
      if (!rowsByY.has(y)) rowsByY.set(y, []);
      rowsByY.get(y).push({ x, text });
    });
    const sortedY = Array.from(rowsByY.keys()).sort((a, b) => b - a);
    sortedY.forEach((y) => {
      const cells = rowsByY
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((c) => c.text);
      if (cells.some((c) => String(c).trim() !== "")) matrix.push(cells);
    });
  }
  return matrix;
}

function existingChildKey(name, dob, grade) {
  return `${String(name || "").trim().toLowerCase()}|${String(dob || "").trim()}|${String(grade || "").trim().toLowerCase()}`;
}

function buildExistingKeys() {
  const keys = new Set();
  cardElementsById.forEach((card) => {
    keys.add(existingChildKey(card.dataset.name, card.dataset.dob, card.dataset.grade));
  });
  return keys;
}

async function saveImportedChildren(children) {
  const t = translations[currentLanguage];
  const seen = buildExistingKeys();
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  let unknownGrade = 0;
  for (const child of children) {
    const key = existingChildKey(child.name, child.dob, child.grade);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    if (!child.grade) unknownGrade += 1;
    try {
      await addDoc(childrenCollection, {
        ...child,
        createdAt: serverTimestamp(),
      });
      saved += 1;
    } catch (error) {
      console.error("Error importing child:", child.name, error);
      failed += 1;
    }
  }
  let message = `${saved} ${t.importDone}`;
  if (skipped > 0) message += ` · ${skipped} ${t.importSkipped}`;
  if (failed > 0) message += ` · ${failed} ${t.importFailed}`;
  if (unknownGrade > 0) message += ` · ${unknownGrade} ${t.importUnknown}`;
  showToast(message);
}

async function handleImportFile(file) {
  const t = translations[currentLanguage];
  if (!file || importInProgress) return;
  const fallbackGrade = GRADE_VALUES.includes(importGradeSelect?.value)
    ? importGradeSelect.value
    : "";
  const lowerName = file.name.toLowerCase();
  importInProgress = true;
  setImportStatus(t.importReading);
  try {
    let matrix;
    if (lowerName.endsWith(".csv")) matrix = await readCsvFile(file);
    else if (lowerName.endsWith(".pdf") || file.type.includes("pdf")) matrix = await readPdfFile(file);
    else matrix = await readSpreadsheetFile(file);
    const children = matrixToChildren(matrix, fallbackGrade);
    if (children.length === 0) {
      setImportStatus(t.importNoRows, true);
      return;
    }
    setImportStatus(`${t.importImporting} (${children.length})`);
    await saveImportedChildren(children);
    setImportStatus("");
    closeImportModal();
  } catch (error) {
    console.error("Error importing file:", error);
    setImportStatus(t.importError, true);
  } finally {
    importInProgress = false;
    if (importFileInput) importFileInput.value = "";
  }
}

if (importFileInput) {
  importFileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) handleImportFile(file);
  });
}
if (cancelImportBtn) {
  cancelImportBtn.addEventListener("click", closeImportModal);
}
if (importModalOverlay) {
  importModalOverlay.addEventListener("click", (event) => {
    if (event.target === importModalOverlay) closeImportModal();
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (importModalOverlay && !importModalOverlay.classList.contains("hidden")) closeImportModal();
    if (upgradeModalOverlay && !upgradeModalOverlay.classList.contains("hidden")) closeUpgradeModal();
  }
});
