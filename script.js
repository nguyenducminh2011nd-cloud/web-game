/* =========================================================
   GIABAOREG.COM - SCRIPT.JS (UNIVERSAL IN-APP & MOBILE SAFE)
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
let isSavingAccount = false;
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
      storage: createUniversalStorage(),
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
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    });

  return cleaned.length > 0 ? cleaned : [FALLBACK_IMG];
}

function normalizeAccountRow(row) {
  return {
    id: Number(row.id),
    code: String(row.code || "LQ").trim(),
    title: String(row.title || "Tài khoản Liên Quân").trim(),
    price: Number(row.price) || 0,
    rank: String(row.rank || "Acc reg").trim(),
    heroes: Number(row.heroes) || 0,
    skins: Number(row.skins) || 0,
    info: String(row.info || "Trắng thông tin").trim(),
    images: normalizeImages(row.images),
    description: String(row.description || "").trim(),
    sold: Boolean(row.sold),
    created_at: row.created_at || null,
    _isDemo: false
  };
}

function renderUploadPreviews() {
  const box = document.getElementById("uploadPreviewList");
  if (!box) return;
  if (!selectedUploadFiles.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = selectedUploadFiles
    .map((file, idx) => {
      const blobUrl = URL.createObjectURL(file);
      return `
        <div style="position:relative;width:74px;height:54px;">
          <img src="${blobUrl}" alt="${escapeHtml(file.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;border:1px solid rgba(56,189,248,0.5);" />
          <span style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.75);color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;">#${idx + 1}</span>
        </div>
      `;
    })
    .join("");
}

async function uploadSelectedAccountFiles() {
  if (!selectedUploadFiles.length) return [];
  if (!sbClient || !currentUser) {
    throw new Error("Cần đăng nhập Admin trước khi tải ảnh lên.");
  }

  const uploadedUrls = [];
  for (let i = 0; i < selectedUploadFiles.length; i++) {
    const file = selectedUploadFiles[i];
    const ext =
      (file.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `acc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error: upError } = await sbClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg"
      });

    if (upError) {
      throw new Error("Tải ảnh lỗi (" + file.name + "): " + upError.message);
    }

    const { data: pubData } = sbClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (pubData?.publicUrl) {
      uploadedUrls.push(pubData.publicUrl);
    }
  }
  return uploadedUrls;
}

function startOnlineCounter() {
  const el = document.getElementById("onlineCount");
  onlineCount = Math.floor(Math.random() * 6) + 5;
  const updateText = () => {
    if (el) el.textContent = String(onlineCount);
  };
  updateText();

  setInterval(() => {
    const delta = Math.floor(Math.random() * 3) - 1;
    onlineCount = Math.max(5, Math.min(10, onlineCount + delta));
    updateText();
  }, 5000);
}

function applyShopConfigToUI() {
  document.querySelectorAll("[data-shop-name]").forEach((el) => {
    el.textContent = shopConfig.shop_name || DEFAULT_CONFIG.shop_name;
  });

  const digits = cleanPhone(shopConfig.zalo_phone);
  const zaloHref =
    shopConfig.zalo && shopConfig.zalo !== "https://zalo.me/"
      ? shopConfig.zalo
      : digits
      ? `https://zalo.me/${digits}`
      : DEFAULT_CONFIG.zalo;

  const fbHref = shopConfig.fb || DEFAULT_CONFIG.fb;

  ["zaloContactBtn", "mainZaloBtn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && zaloHref) el.href = zaloHref;
  });

  ["fbContactBtn", "mainMessBtn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && fbHref) {
      el.href = fbHref;
      el.style.display = "inline-flex";
    }
  });

  const phoneBadge = document.getElementById("zaloPhoneDisplay");
  const phoneText = document.getElementById("zaloPhoneText");
  if (phoneBadge && phoneText) {
    if (digits) {
      phoneText.textContent = digits;
      phoneBadge.style.display = "inline-flex";
    } else {
      phoneBadge.style.display = "none";
    }
  }

  const cfgNameInput = document.getElementById("cfgShopName");
  const cfgPhoneInput = document.getElementById("cfgZaloPhone");
  const cfgZaloInput = document.getElementById("cfgZalo");
  const cfgFbInput = document.getElementById("cfgFb");
  if (cfgNameInput && document.activeElement !== cfgNameInput) {
    cfgNameInput.value = shopConfig.shop_name || "";
  }
  if (cfgPhoneInput && document.activeElement !== cfgPhoneInput) {
    cfgPhoneInput.value = shopConfig.zalo_phone || digits || "";
  }
  if (cfgZaloInput && document.activeElement !== cfgZaloInput) {
    cfgZaloInput.value = zaloHref;
  }
  if (cfgFbInput && document.activeElement !== cfgFbInput) {
    cfgFbInput.value = fbHref;
  }
}

async function fetchShopConfig() {
  if (!sbClient) return;
  try {
    const { data, error } = await sbClient
      .from("shop_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.warn("Lỗi tải shop_config:", error.message);
      return;
    }
    if (data) {
      let extractedPhone = String(data.zalo_phone || "").trim();
      if (!extractedPhone && typeof data.zalo === "string") {
        const match = data.zalo.match(/zalo\.me\/(\d{7,15})/i);
        if (match) extractedPhone = match[1];
      }
      shopConfig = {
        id: 1,
        shop_name: data.shop_name || DEFAULT_CONFIG.shop_name,
        zalo_phone: extractedPhone,
        zalo:
          data.zalo ||
          (extractedPhone ? `https://zalo.me/${extractedPhone}` : DEFAULT_CONFIG.zalo),
        fb: data.fb || DEFAULT_CONFIG.fb
      };
      applyShopConfigToUI();
    }
  } catch (err) {
    console.warn("Ngoại lệ khi tải shop_config:", err);
  }
}

async function fetchAccounts(notifyError = false, forceRender = false) {
  if (!forceRender && (isAdminModalOpen() || isSavingAccount)) {
    return;
  }

  if (!sbClient) {
    isSupabaseConnected = false;
    accountsData = [...DEMO_ACCOUNTS];
    renderAccounts();
    renderAdminTable();
    updateStats();
    return;
  }

  try {
    const { data, error } = await sbClient
      .from("accounts")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Lỗi tải accounts:", error.message);
      if (notifyError) {
        showToast("Lỗi tải dữ liệu Supabase: " + error.message, "error");
      }
      if (!isSupabaseConnected && accountsData.length === 0) {
        accountsData = [...DEMO_ACCOUNTS];
      }
      renderAccounts();
      renderAdminTable();
      updateStats();
      return;
    }

    isSupabaseConnected = true;
    const rows = Array.isArray(data) ? data.map(normalizeAccountRow) : [];
    accountsData = rows.length > 0 ? rows : currentUser ? [] : [...DEMO_ACCOUNTS];
    renderAccounts();
    renderAdminTable();
    updateStats();
  } catch (err) {
    console.error("Ngoại lệ khi tải accounts:", err);
    if (notifyError) {
      showToast("Không thể kết nối tới Supabase.", "error");
    }
  }
}

function updateStats() {
  const totalEl = document.getElementById("statTotalAcc");
  const availableEl = document.getElementById("statAvailableAcc");
  const soldEl = document.getElementById("statSoldAcc");

  const realList = accountsData.filter((a) => !a._isDemo);
  const total = realList.length;
  const sold = realList.filter((a) => a.sold).length;
  const available = total - sold;

  if (totalEl) totalEl.textContent = String(total);
  if (availableEl) availableEl.textContent = String(available);
  if (soldEl) soldEl.textContent = String(sold);
}

function getFilteredAccounts() {
  let list = [...accountsData];

  if (currentFilter === "available") {
    list = list.filter((a) => !a.sold);
  } else if (currentFilter === "sold") {
    list = list.filter((a) => a.sold);
  } else if (currentFilter === "under50") {
    list = list.filter((a) => !a.sold && a.price > 0 && a.price < 50000);
  } else if (currentFilter === "50to150") {
    list = list.filter((a) => !a.sold && a.price >= 50000 && a.price <= 150000);
  } else if (currentFilter === "150to300") {
    list = list.filter((a) => !a.sold && a.price > 150000 && a.price <= 300000);
  } else if (currentFilter === "300to500") {
    list = list.filter((a) => !a.sold && a.price > 300000 && a.price <= 500000);
  } else if (currentFilter === "over500") {
    list = list.filter((a) => !a.sold && a.price > 500000);
  } else if (currentFilter === "manySkins") {
    list = list.filter((a) => !a.sold && a.skins >= 100);
  }

  if (currentRankFilter && currentRankFilter !== "all") {
    const targetRank = currentRankFilter.toLowerCase();
    list = list.filter((a) => String(a.rank || "").toLowerCase().includes(targetRank));
  }

  if (searchKeyword.trim()) {
    const q = searchKeyword.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.rank.toLowerCase().includes(q) ||
        a.info.toLowerCase().includes(q)
    );
  }

  if (currentSort === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (currentSort === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  } else if (currentSort === "skins-desc") {
    list.sort((a, b) => b.skins - a.skins);
  } else {
    list.sort((a, b) => b.id - a.id);
  }

  return list;
}

function renderAccounts() {
  const grid = document.getElementById("accountsGrid");
  if (!grid) return;

  const list = getFilteredAccounts();
  if (list.length === 0) {
    grid.innerHTML = `
      <div class="rgb-frame" style="grid-column:1/-1;text-align:center;padding:42px 16px;color:#94a3b8;">
        Chưa có tài khoản nào trong danh mục này. Mở <b>Quản Lý Shop</b> để thêm tài khoản mới.
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((acc) => {
      const thumb = acc.images[0] || FALLBACK_IMG;

      return `
        <article class="acc-card rgb-frame ${acc.sold ? "is-sold" : ""}" data-id="${acc.id}">
          <div class="acc-thumb-wrap" onclick="openAccountDetail(${acc.id})">
            <img
              src="${escapeHtml(thumb)}"
              alt="${escapeHtml(acc.title)}"
              loading="lazy"
              onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"
            />
            <span class="acc-code">#${escapeHtml(acc.code)}</span>
            ${acc.sold ? `<span class="acc-sold-badge">ĐÃ BÁN</span>` : ""}
          </div>
          <div class="acc-body">
            <h3 class="acc-title" onclick="openAccountDetail(${acc.id})">${escapeHtml(acc.title)}</h3>
            <div class="acc-meta">
              <span>Rank: <b>${escapeHtml(acc.rank)}</b></span>
              <span>Tướng: <b>${acc.heroes}</b></span>
              <span>Skin: <b>${acc.skins}</b></span>
            </div>
            <div class="acc-info-tag">${escapeHtml(acc.info)}</div>
            <div class="acc-footer">
              <span class="acc-price">${acc.sold ? "ĐÃ BÁN" : formatVND(acc.price)}</span>
              <button type="button" class="btn-detail" onclick="openAccountDetail(${acc.id})">
                ${acc.sold ? "Xem lại" : "Chi tiết"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function openAccountDetail(id) {
  const acc = accountsData.find((item) => item.id === Number(id));
  if (!acc) return;

  activeDetailAccId = acc.id;
  detailGalleryIndex = 0;

  const modal = document.getElementById("detailModal");
  if (!modal) return;

  const mainImg = document.getElementById("detailMainImg");
  const thumbsWrap = document.getElementById("detailThumbs");
  const titleEl = document.getElementById("detailTitle");
  const codeEl = document.getElementById("detailCode");
  const priceEl = document.getElementById("detailPrice");
  const rankEl = document.getElementById("detailRank");
  const heroesEl = document.getElementById("detailHeroes");
  const skinsEl = document.getElementById("detailSkins");
  const infoEl = document.getElementById("detailInfo");
  const descEl = document.getElementById("detailDesc");
  const buyBtn = document.getElementById("detailBuyBtn");

  if (titleEl) titleEl.textContent = acc.title;
  if (codeEl) codeEl.textContent = "Mã acc: #" + acc.code;
  if (priceEl) priceEl.textContent = acc.sold ? "ĐÃ BÁN" : formatVND(acc.price);
  if (rankEl) rankEl.textContent = acc.rank;
  if (heroesEl) heroesEl.textContent = String(acc.heroes);
  if (skinsEl) skinsEl.textContent = String(acc.skins);
  if (infoEl) infoEl.textContent = acc.info;
  if (descEl) {
    descEl.textContent = acc.description || "Liên hệ shop để kiểm tra chi tiết tài khoản.";
  }

  const updateGallery = () => {
    const safeUrl = acc.images[detailGalleryIndex] || FALLBACK_IMG;
    if (mainImg) {
      mainImg.onerror = () => {
        mainImg.onerror = null;
        mainImg.src = FALLBACK_IMG;
      };
      mainImg.src = safeUrl;
    }
    if (thumbsWrap) {
      thumbsWrap.innerHTML = acc.images
        .map(
          (imgUrl, idx) => `
          <img
            src="${escapeHtml(imgUrl)}"
            alt="Ảnh ${idx + 1}"
            style="width:64px;height:44px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${
              idx === detailGalleryIndex ? "#38bdf8" : "rgba(148,163,184,0.25)"
            };"
            onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"
            onclick="selectDetailImage(${idx})"
          />
        `
        )
        .join("");
    }
  };

  window.selectDetailImage = (idx) => {
    detailGalleryIndex = idx;
    updateGallery();
  };

  updateGallery();

  if (buyBtn) {
    if (acc.sold) {
      buyBtn.textContent = "Tài khoản đã bán";
      buyBtn.disabled = true;
      buyBtn.onclick = null;
    } else {
      buyBtn.textContent = `Mua ngay acc #${acc.code}`;
      buyBtn.disabled = false;
      buyBtn.onclick = () => {
        const digits = cleanPhone(shopConfig.zalo_phone);
        const contactTarget =
          shopConfig.zalo && shopConfig.zalo !== "https://zalo.me/"
            ? shopConfig.zalo
            : digits
            ? `https://zalo.me/${digits}`
            : shopConfig.fb || "https://zalo.me/";
        showToast(`Đang mở liên hệ mua acc #${acc.code}...`, "info");
        window.open(contactTarget, "_blank", "noopener,noreferrer");
      };
    }
  }

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
}

function closeDetailModal() {
  const modal = document.getElementById("detailModal");
  if (!modal) return;
  modal.style.display = "none";
  activeDetailAccId = null;
  if (!isAdminModalOpen()) {
    document.body.classList.remove("modal-open");
  }
}

function syncAuthUI() {
  const loginBox = document.getElementById("adminLoginBox");
  const panelBox = document.getElementById("adminPanelBox");
  const userBadge = document.getElementById("adminUserEmail");
  const emailPrefill = document.getElementById("adminEmail");

  if (emailPrefill && !emailPrefill.value) {
    emailPrefill.value = ADMIN_DEFAULT_EMAIL;
  }

  if (currentUser) {
    if (loginBox) loginBox.style.display = "none";
    if (panelBox) panelBox.style.display = "block";
    if (userBadge) userBadge.textContent = "Đã đăng nhập: " + (currentUser.email || "Admin");
  } else {
    if (loginBox) loginBox.style.display = "block";
    if (panelBox) panelBox.style.display = "none";
    if (userBadge) userBadge.textContent = "Chưa đăng nhập phiên quản trị";
  }
}

async function openAdminModal() {
  const modal = document.getElementById("adminModal");
  if (!modal) return;

  modal.style.display = "flex";
  document.body.classList.add("modal-open");

  if (sbClient && sbClient.auth && typeof sbClient.auth.getSession === "function" && !currentUser) {
    try {
      const { data } = await sbClient.auth.getSession();
      currentUser = data?.session?.user || null;
    } catch (err) {
      console.warn("Không đọc được session:", err);
    }
  }
  syncAuthUI();
  renderAdminTable();
  applyShopConfigToUI();
}

function closeAdminModal() {
  const modal = document.getElementById("adminModal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.classList.remove("modal-open");
  fetchAccounts(false, true);
}

async function handleAdminLogin(e) {
  e.preventDefault();
  if (!sbClient) {
    showToast("Chưa khởi tạo được Supabase Client.", "error");
    return;
  }

  const emailInput = document.getElementById("adminEmail");
  const passInput = document.getElementById("adminPassword");
  const submitBtn = document.getElementById("adminLoginSubmitBtn");
  const email = (emailInput?.value || "").trim();
  const password = (passInput?.value || "").trim();

  if (!email || !password) {
    showToast("Vui lòng nhập đầy đủ Email và Mật khẩu.", "warning");
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) {
      showToast("Đăng nhập thất bại: " + error.message, "error");
      return;
    }

    currentUser = data?.user || null;
    if (passInput) passInput.value = "";
    syncAuthUI();
    await Promise.all([fetchShopConfig(), fetchAccounts(true, true)]);
    showToast("Đăng nhập quản trị thành công!", "success");
  } catch (err) {
    showToast("Lỗi kết nối khi đăng nhập: " + (err?.message || err), "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleAdminLogout() {
  if (sbClient) {
    await sbClient.auth.signOut();
  }
  currentUser = null;
  resetAccountForm();
  syncAuthUI();
  await fetchAccounts(false, true);
  showToast("Đã đăng xuất khỏi phiên quản trị.", "info");
}

function resetAccountForm() {
  editingAccId = null;
  selectedUploadFiles = [];
  renderUploadPreviews();

  const fileInput = document.getElementById("accFiles");
  if (fileInput) fileInput.value = "";

  const form = document.getElementById("accountForm");
  if (form) form.reset();

  const submitBtn = document.getElementById("saveAccountBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (submitBtn) submitBtn.textContent = "Thêm tài khoản mới";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
}

function startEditAccount(id) {
  const acc = accountsData.find((item) => item.id === Number(id));
  if (!acc || acc._isDemo) {
    showToast("Đây là dữ liệu mẫu, hãy thêm tài khoản thật rồi sửa.", "warning");
    return;
  }

  editingAccId = acc.id;
  selectedUploadFiles = [];
  renderUploadPreviews();

  const setVal = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = val;
  };

  setVal("accCode", acc.code);
  setVal("accTitle", acc.title);
  setVal("accPrice", acc.price);
  setVal("accRank", acc.rank);
  setVal("accHeroes", acc.heroes);
  setVal("accSkins", acc.skins);
  setVal("accInfo", acc.info);
  setVal("accImages", acc.images.join("\n"));
  setVal("accDesc", acc.description);

  const soldCheckbox = document.getElementById("accSold");
  if (soldCheckbox) soldCheckbox.checked = Boolean(acc.sold);

  const submitBtn = document.getElementById("saveAccountBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (submitBtn) submitBtn.textContent = `Lưu cập nhật #${acc.code}`;
  if (cancelEditBtn) cancelEditBtn.style.display = "inline-flex";
}

async function handleSaveAccount(e) {
  e.preventDefault();
  if (isSavingAccount) return;

  if (!currentUser && sbClient?.auth) {
    try {
      const { data } = await sbClient.auth.getSession();
      currentUser = data?.session?.user || null;
      syncAuthUI();
    } catch {}
  }

  if (!currentUser) {
    showToast("Bạn cần đăng nhập Admin trước khi thêm/sửa acc.", "warning");
    return;
  }
  if (!sbClient) {
    showToast("Chưa kết nối Supabase.", "error");
    return;
  }

  const getVal = (id) => (document.getElementById(id)?.value || "").trim();
  const getNum = (id) => Number(document.getElementById(id)?.value || 0) || 0;

  const code = getVal("accCode");
  const title = getVal("accTitle");
  if (!code || !title) {
    showToast("Mã acc và tiêu đề không được để trống.", "warning");
    return;
  }

  isSavingAccount = true;
  const submitBtn = document.getElementById("saveAccountBtn");
  if (submitBtn) submitBtn.disabled = true;

  try {
    let uploadedUrls = [];
    if (selectedUploadFiles.length > 0) {
      showToast(`Đang tải ${selectedUploadFiles.length} ảnh lên...`, "info");
      uploadedUrls = await uploadSelectedAccountFiles();
    }

    const manualImgs = normalizeImages(getVal("accImages")).filter((u) => u !== FALLBACK_IMG);
    const finalImages =
      uploadedUrls.length > 0
        ? [...uploadedUrls, ...manualImgs]
        : normalizeImages(getVal("accImages"));

    const payload = {
      code,
      title,
      price: getNum("accPrice"),
      rank: getVal("accRank") || "Acc reg",
      heroes: getNum("accHeroes"),
      skins: getNum("accSkins"),
      info: getVal("accInfo") || "Trắng thông tin",
      images: finalImages,
      description: getVal("accDesc"),
      sold: Boolean(document.getElementById("accSold")?.checked)
    };

    if (editingAccId !== null) {
      const { error } = await sbClient
        .from("accounts")
        .update(payload)
        .eq("id", editingAccId);

      if (error) {
        showToast("Cập nhật acc lỗi: " + error.message, "error");
        return;
      }
      showToast(`Đã cập nhật tài khoản #${code}.`, "success");
    } else {
      const { error } = await sbClient.from("accounts").insert([payload]);
      if (error) {
        showToast("Thêm acc lỗi: " + error.message, "error");
        return;
      }
      showToast(`Đã thêm tài khoản #${code} lên Supabase!`, "success");
    }

    resetAccountForm();
    await fetchAccounts(true, true);
  } catch (err) {
    showToast(err?.message || "Lỗi khi lưu tài khoản.", "error");
  } finally {
    isSavingAccount = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function toggleSoldStatus(id) {
  if (!currentUser || !sbClient) {
    showToast("Cần đăng nhập Admin để đổi trạng thái.", "warning");
    return;
  }
  const acc = accountsData.find((item) => item.id === Number(id));
  if (!acc || acc._isDemo) return;

  const { error } = await sbClient
    .from("accounts")
    .update({ sold: !acc.sold })
    .eq("id", acc.id);

  if (error) {
    showToast("Đổi trạng thái lỗi: " + error.message, "error");
    return;
  }

  showToast(
    !acc.sold ? `Đã đánh dấu #${acc.code} là ĐÃ BÁN.` : `Đã mở bán lại #${acc.code}.`,
    "success"
  );
  await fetchAccounts(true, true);
}

async function deleteAccount(id) {
  if (!currentUser || !sbClient) {
    showToast("Cần đăng nhập Admin để xóa tài khoản.", "warning");
    return;
  }
  const acc = accountsData.find((item) => item.id === Number(id));
  if (!acc || acc._isDemo) {
    showToast("Không thể xóa dữ liệu mẫu khi chưa có acc trên Supabase.", "warning");
    return;
  }

  const label = `#${acc.code}`;
  if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn tài khoản ${label}?`)) return;

  const { error } = await sbClient.from("accounts").delete().eq("id", Number(id));
  if (error) {
    showToast("Xóa acc lỗi: " + error.message, "error");
    return;
  }

  if (editingAccId === Number(id)) {
    resetAccountForm();
  }
  showToast(`Đã xóa ${label}.`, "success");
  await fetchAccounts(true, true);
}

async function handleSaveConfig(e) {
  e.preventDefault();
  if (!currentUser || !sbClient) {
    showToast("Cần đăng nhập Admin để lưu cấu hình shop.", "warning");
    return;
  }

  const shopName =
    (document.getElementById("cfgShopName")?.value || "").trim() || DEFAULT_CONFIG.shop_name;
  const zaloPhone = cleanPhone(document.getElementById("cfgZaloPhone")?.value || "");
  let zaloLink = (document.getElementById("cfgZalo")?.value || "").trim();
  const fbLink = (document.getElementById("cfgFb")?.value || "").trim() || DEFAULT_CONFIG.fb;

  if (zaloPhone && (!zaloLink || zaloLink === "https://zalo.me/")) {
    zaloLink = `https://zalo.me/${zaloPhone}`;
  } else if (!zaloLink) {
    zaloLink = DEFAULT_CONFIG.zalo;
  }

  const nextConfig = {
    id: 1,
    shop_name: shopName,
    zalo_phone: zaloPhone,
    zalo: zaloLink,
    fb: fbLink
  };

  let { error } = await sbClient
    .from("shop_config")
    .upsert(nextConfig, { onConflict: "id" });

  if (error && /zalo_phone/i.test(error.message)) {
    const fallbackCfg = {
      id: 1,
      shop_name: shopName,
      zalo: zaloLink,
      fb: fbLink
    };
    const retry = await sbClient
      .from("shop_config")
      .upsert(fallbackCfg, { onConflict: "id" });
    error = retry.error;
  }

  if (error) {
    showToast("Lưu cấu hình lỗi: " + error.message, "error");
    return;
  }

  shopConfig = nextConfig;
  applyShopConfigToUI();
  showToast("Đã lưu cấu hình shop lên Supabase!", "success");
}

function renderAdminTable() {
  const tbody = document.getElementById("adminAccountsBody");
  if (!tbody) return;

  const realAccounts = accountsData.filter((a) => !a._isDemo);

  if (realAccounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:18px;color:#94a3b8;">Chưa có tài khoản thật nào trên Supabase. Hãy dùng form ở trên để thêm mới.</td></tr>`;
    return;
  }

  tbody.innerHTML = realAccounts
    .map(
      (acc) => `
      <tr>
        <td><b>#${escapeHtml(acc.code)}</b></td>
        <td>${escapeHtml(acc.title)}</td>
        <td>${formatVND(acc.price)}</td>
        <td>${
          acc.sold
            ? '<span style="color:#f87171;font-weight:700;">Đã bán</span>'
            : '<span style="color:#4ade80;font-weight:700;">Còn hàng</span>'
        }</td>
        <td style="white-space:nowrap;display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" onclick="toggleSoldStatus(${acc.id})">${
        acc.sold ? "Mở bán" : "Đã bán"
      }</button>
          <button type="button" class="btn btn-sm" onclick="startEditAccount(${acc.id})">Sửa</button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id})">Xóa</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function scheduleRealtimeRefresh(fn) {
  if (realtimeTimer) clearTimeout(realtimeTimer);
  realtimeTimer = setTimeout(() => {
    if (!isAdminModalOpen() && !isSavingAccount) {
      fn();
    }
  }, 800);
}

function subscribeRealtime() {
  if (!sbClient || typeof sbClient.channel !== "function") return;
  try {
    sbClient
      .channel("shop-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        () => {
          scheduleRealtimeRefresh(() => fetchAccounts(false, false));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_config" },
        () => {
          scheduleRealtimeRefresh(() => fetchShopConfig());
        }
      )
      .subscribe();
  } catch (err) {
    console.warn("Không thể bật Realtime:", err);
  }
}

document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("#openAdminBtn");
  if (openBtn) {
    e.preventDefault();
    openAdminModal();
    return;
  }

  const closeAdmin = e.target.closest("#closeAdminBtn");
  if (closeAdmin) {
    e.preventDefault();
    closeAdminModal();
    return;
  }

  const closeDetail = e.target.closest("#closeDetailBtn");
  if (closeDetail) {
    e.preventDefault();
    closeDetailModal();
    return;
  }

  const togglePass = e.target.closest("#togglePassBtn");
  if (togglePass) {
    e.preventDefault();
    const passInput = document.getElementById("adminPassword");
    if (passInput) {
      const nextType = passInput.type === "password" ? "text" : "password";
      passInput.type = nextType;
      togglePass.textContent = nextType === "password" ? "👁️" : "🙈";
    }
  }
});

function bindEvents() {
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter") || "all";
      renderAccounts();
    });
  });

  document.querySelectorAll("[data-rank-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-rank-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRankFilter = btn.getAttribute("data-rank-filter") || "all";
      renderAccounts();
    });
  });

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value || "default";
      renderAccounts();
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchKeyword = e.target.value || "";
      renderAccounts();
    });
  }

  const fileInput = document.getElementById("accFiles");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      selectedUploadFiles = Array.from(e.target.files || []);
      renderUploadPreviews();
    });
  }

  const syncNowBtn = document.getElementById("syncNowBtn");
  if (syncNowBtn) {
    syncNowBtn.addEventListener("click", async () => {
      await Promise.all([fetchShopConfig(), fetchAccounts(true, true)]);
      showToast("Đã đồng bộ dữ liệu mới nhất từ Supabase.", "success");
    });
  }

  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleAdminLogout);

  const accForm = document.getElementById("accountForm");
  if (accForm) accForm.addEventListener("submit", handleSaveAccount);

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", resetAccountForm);

  const cfgForm = document.getElementById("configForm");
  if (cfgForm) cfgForm.addEventListener("submit", handleSaveConfig);

  const detailModal = document.getElementById("detailModal");
  if (detailModal) {
    detailModal.addEventListener("click", (e) => {
      if (e.target === detailModal) closeDetailModal();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailModal();
    }
  });
}

async function initApp() {
  bindEvents();
  startOnlineCounter();
  applyShopConfigToUI();
  accountsData = [...DEMO_ACCOUNTS];
  renderAccounts();
  updateStats();

  try {
    sbClient = createSupabaseInstance();
    if (!sbClient) {
      showToast("Chưa tải được thư viện Supabase.", "warning");
      return;
    }

    const { data } = await sbClient.auth.getSession();
    currentUser = data?.session?.user || null;
    syncAuthUI();

    sbClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      syncAuthUI();
    });

    await Promise.all([fetchShopConfig(), fetchAccounts(false, true)]);
    subscribeRealtime();
  } catch (err) {
    console.error("Lỗi khởi tạo ứng dụng:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
