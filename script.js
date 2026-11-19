/* =========================================================
   GIABAOREG.COM - SCRIPT.JS (SUPABASE + STORAGE UPLOAD + SYNC)
   ========================================================= */

const SUPABASE_URL = "https://iuezvuzvnhscxkqdrccp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o8O08I4ZFykn4f7It54BmA_tr_8lhDq";
const ADMIN_DEFAULT_EMAIL = "nguyenducminh2011nd@gmail.com";
const STORAGE_BUCKET = "account-images";

const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <rect width="600" height="360" fill="#0d1424"/>
      <rect x="18" y="18" width="564" height="324" rx="18" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="8 6"/>
      <text x="300" y="168" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="22" font-weight="bold" text-anchor="middle">GIABAOREG.COM</text>
      <text x="300" y="202" fill="#94a3b8" font-family="Arial, sans-serif" font-size="15" text-anchor="middle">Kho Tai Khoan Lien Quan Mobile</text>
    </svg>
  `);

const DEFAULT_CONFIG = {
  id: 1,
  shop_name: "Giabaoreg.com",
  zalo_phone: "",
  zalo: "https://zalo.me/",
  fb: "https://m.me/"
};

const DEMO_ACCOUNTS = [
  {
    id: -1,
    code: "LQ001",
    title: "Acc Mẫu - Rank Cao Thủ (Hãy thêm acc thật trong Quản Lý Shop)",
    price: 250000,
    rank: "Cao Thủ",
    heroes: 108,
    skins: 145,
    info: "Trắng thông tin",
    images: [FALLBACK_IMG],
    description:
      "Dữ liệu mẫu hiển thị khi bảng accounts trên Supabase chưa có acc. Đăng nhập Quản Lý Shop để thêm acc thật.",
    sold: false,
    _isDemo: true
  }
];

let sbClient = null;
let isSupabaseConnected = false;
let currentUser = null;
let accountsData = [];
let shopConfig = { ...DEFAULT_CONFIG };
let currentFilter = "all";
let currentRankFilter = "all";
let currentSort = "default";
let searchKeyword = "";
let detailGalleryIndex = 0;
let activeDetailAccId = null;
let editingAccId = null;
let onlineCount = 7;
let selectedUploadFiles = [];

function createSupabaseInstance() {
  const globalLib = window.supabase;
  if (!globalLib || typeof globalLib.createClient !== "function") {
    return null;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  return globalLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

function formatVND(num) {
  const n = Number(num) || 0;
  return n.toLocaleString("vi-VN") + "đ";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanPhone(raw) {
  return String(raw || "").replace(/\D+/g, "");
}

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText =
      "position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bgMap = {
    success: "linear-gradient(135deg, #15803d, #166534)",
    error: "linear-gradient(135deg, #b91c1c, #7f1d1d)",
    warning: "linear-gradient(135deg, #a16207, #713f12)",
    info: "linear-gradient(135deg, #0284c7, #1e293b)"
  };
  toast.textContent = message;
  toast.style.cssText = `
    background:${bgMap[type] || bgMap.info};
    color:#fff;
    padding:11px 15px;
    border-radius:12px;
    font-size:13.5px;
    line-height:1.4;
    box-shadow:0 12px 28px rgba(0,0,0,0.45);
    border:1px solid rgba(255,255,255,0.18);
    transition:opacity 0.25s ease, transform 0.25s ease;
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 260);
  }, 3400);
}

function normalizeImages(rawImages) {
  let list = [];
  if (Array.isArray(rawImages)) {
    list = rawImages;
  } else if (typeof rawImages === "string" && rawImages.trim()) {
    try {
      const parsed = JSON.parse(rawImages);
      list = Array.isArray(parsed) ? parsed : rawImages.split(/[\n,]+/);
    } catch {
      list = rawImages.split(/[\n,]+/);
    }
  }

  const cleaned = list
    .map((item) => String(item || "").trim())
    .filter((url) => {
      if (!url) return false;
      if (url.startsWith("data:image/")) return true;
      try {
