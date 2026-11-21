/* =========================================================
   GIABAOREG.COM - SCRIPT.JS (ACC CO NHON + OTHER ACCS + CHUNG SUC)
   ========================================================= */

const SUPABASE_URL = "https://iuezvuzvnhscxkqdrccp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o8O08I4ZFykn4f7It54BmA_tr_8lhDq";
const ADMIN_DEFAULT_EMAIL = "nguyenducminh2011nd@gmail.com";
const STORAGE_BUCKET = "account-images";
const LOCAL_REVIEWS_KEY = "giabaoreg_reviews_v2";
const LOCAL_REVIEWS_INIT_KEY = "giabaoreg_reviews_initialized_v2";
const LOCAL_SUPPORT_KEY = "giabaoreg_support_v1";

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
    folder_id: null,
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

function createUniversalStorage() {
  const mem = {};
  try {
    const testKey = "__gb_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    };
  }
}

const safeStorage = createUniversalStorage();

let sbClient = null;
let isSupabaseConnected = false;
let hasReviewsTable = true;
let hasFoldersTable = true;
let hasSupportTable = true;
let currentUser = null;
let foldersData = [];
let accountsData = [];
let reviewsData = [];
let supportData = [];
let shopConfig = { ...DEFAULT_CONFIG };
let currentFilter = "all";
let currentRankFilter = "all";
let currentFolderFilter = null;
let currentSort = "default";
let searchKeyword = "";
let detailGalleryIndex = 0;
let activeDetailAccId = null;
let activeFolderId = null;
let editingAccId = null;
let editingFolderId = null;
let onlineCount = 7;
let selectedUploadFiles = [];
let selectedFolderCoverFile = null;
let isSavingAccount = false;
let isSavingFolder = false;
let isSubmittingReview = false;
let isSubmittingSupport = false;
let realtimeTimer = null;

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
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
}

function formatVND(num) {
  const n = Number(num) || 0;
  return n.toLocaleString("vi-VN") + "đ";
}

function formatDateVN(isoStr) {
  if (!isoStr) return "Vừa xong";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "Vừa xong";
  return d.toLocaleDateString("vi-VN");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripLeadingHashes(code) {
  return String(code || "").replace(/^#+/, "").trim();
}

function cleanPhone(raw) {
  return String(raw || "").replace(/\D+/g, "");
}

function isAdminModalOpen() {
  const modal = document.getElementById("adminModal");
  return Boolean(modal && modal.style.display === "flex");
}

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText =
      "position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px;pointer-events:none;";
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
  }, 3600);
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return Boolean(ok);
  } catch {
    return false;
  }
}

function getContactUrl() {
  const digits = cleanPhone(shopConfig.zalo_phone);
  if (shopConfig.zalo && shopConfig.zalo !== "https://zalo.me/") {
    return shopConfig.zalo;
  }
  if (digits) {
    return `https://zalo.me/${digits}`;
  }
  return shopConfig.fb || "https://zalo.me/";
}

function buildBuySyntax(acc) {
  const code = stripLeadingHashes(acc.code);
  const priceText = formatVND(acc.price);
  return `Chào shop, mình muốn mua acc Liên Quân mã #${code} (${acc.title}) - Giá ${priceText}. Acc này còn không shop?`;
}

function calcFolderOrderPrice(folder, qty) {
  const unitRetail = Number(folder.price) || 0;
  const unitBulk = Number(folder.bulk_price) > 0 ? Number(folder.bulk_price) : unitRetail;
  const minBulk = Math.max(2, Number(folder.bulk_min_qty) || 5);
  const isBulk = qty >= minBulk && unitBulk < unitRetail;
  const appliedUnit = isBulk ? unitBulk : unitRetail;
  return {
    isBulk,
    unitPrice: appliedUnit,
    totalPrice: appliedUnit * qty
  };
}

function buildFolderBuySyntax(folder, qty, isWholeLot = false) {
  const code = stripLeadingHashes(folder.code);
  const { isBulk, unitPrice, totalPrice } = calcFolderOrderPrice(folder, qty);
  const modeText = isWholeLot ? "CHỐT CẢ LÔ" : isBulk ? "MUA SLL (GIÁ SỈ)" : "MUA LẺ";
  return `Chào shop, mình muốn ${modeText} ${qty} acc thuộc gói #${code} (${folder.title}) - Đơn giá ${formatVND(unitPrice)}/acc - Tổng ${formatVND(totalPrice)}. Shop hỗ trợ giao acc giúp mình nhé!`;
}

function loadLocalSupport() {
  try {
    const raw = safeStorage.getItem(LOCAL_SUPPORT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalSupport(list) {
  try {
    safeStorage.setItem(LOCAL_SUPPORT_KEY, JSON.stringify(list));
  } catch {}
}

function normalizeSupportRow(row) {
  return {
    id: row.id,
    sender_name: String(row.sender_name || "Người chơi").trim(),
    event_name: String(row.event_name || "Chung sức Tết Liên Quân").trim(),
    link_or_code: String(row.link_or_code || "").trim(),
    note: String(row.note || "").trim(),
    status: String(row.status || "Đang chờ hỗ trợ").trim(),
    created_at: row.created_at || new Date().toISOString()
  };
}

function renderSupportList() {
  const listEl = document.getElementById("supportList");
  if (!listEl) return;

  if (!supportData.length) {
    listEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:18px 12px;color:#94a3b8;background:rgba(7,11,20,0.65);border-radius:12px;border:1px dashed rgba(148,163,184,0.22);">
        Chưa có yêu cầu chung sức nào. Dán link hoặc mã chung sức ở trên để gửi hỗ trợ!
      </div>
    `;
    return;
  }

  listEl.innerHTML = supportData
    .slice(0, 12)
    .map((item) => {
      const isDone = /xong|đã hỗ trợ|hoàn tất/i.test(item.status);
      return `
        <article class="support-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong>${escapeHtml(item.sender_name)}</strong>
            <span class="support-status ${isDone ? "done" : ""}">${escapeHtml(item.status)}</span>
          </div>
          <div style="font-size:0.8rem;color:#7dd3fc;">${escapeHtml(item.event_name)}</div>
          <div style="font-size:0.86rem;color:#f8fafc;word-break:break-all;background:rgba(15,23,42,0.85);padding:6px 8px;border-radius:8px;">
            ${escapeHtml(item.link_or_code)}
          </div>
          ${item.note ? `<div style="font-size:0.82rem;color:#cbd5e1;">${escapeHtml(item.note)}</div>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:4px;font-size:0.75rem;color:#64748b;">
            <span>${escapeHtml(formatDateVN(item.created_at))}</span>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn btn-sm" onclick="copySupportCode(${JSON.stringify(item.link_or_code)})">Copy</button>
              ${
                currentUser
                  ? `<button type="button" class="btn btn-sm" onclick="toggleSupportStatus(${JSON.stringify(item.id)}, ${JSON.stringify(item.status)})">${
                      isDone ? "Chờ" : "Xong"
                    }</button>
                   <button type="button" class="btn btn-danger btn-sm" onclick="deleteSupportRequest(${JSON.stringify(item.id)})">Xóa</button>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function copySupportCode(val) {
  const ok = await copyTextToClipboard(val);
  showToast(ok ? "Đã copy mã/link chung sức!" : val, ok ? "success" : "info");
}

async function fetchSupportRequests() {
  if (!sbClient || !hasSupportTable) {
    supportData = loadLocalSupport().map(normalizeSupportRow);
    renderSupportList();
    return;
  }

  try {
    const { data, error } = await sbClient
      .from("support_requests")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      hasSupportTable = false;
      supportData = loadLocalSupport().map(normalizeSupportRow);
      renderSupportList();
      return;
    }

    supportData = Array.isArray(data) ? data.map(normalizeSupportRow) : [];
    renderSupportList();
  } catch {
    supportData = loadLocalSupport().map(normalizeSupportRow);
    renderSupportList();
  }
}

async function handleCreateSupport(e) {
  e.preventDefault();
  if (isSubmittingSupport) return;

  const nameEl = document.getElementById("supName");
  const eventEl = document.getElementById("supEvent");
  const linkEl = document.getElementById("supLinkCode");
  const noteEl = document.getElementById
