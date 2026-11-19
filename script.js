// ==========================================
// 1. CẤU HÌNH DATABASE CHUNG (SUPABASE)
// Điền SUPABASE_URL và SUPABASE_ANON_KEY để đồng bộ mọi thiết bị
// Nếu để trống, web tạm dùng LocalStorage trên máy hiện tại
// ==========================================
const SUPABASE_URL = ""; // VD: "https://xxxx.supabase.co"
const SUPABASE_ANON_KEY = ""; // VD: "eyJhbGciOi..."
const SUPABASE_TABLE = "accounts";

const DEFAULT_CONFIG = {
    shopName: "Giabaoreg.com",
    zalo: "https://zalo.me/",
    fb: "https://m.me/",
    adminPass: "123456"
};

let shopConfig = JSON.parse(localStorage.getItem("giabaoreg_config")) || { ...DEFAULT_CONFIG };
let accounts = JSON.parse(localStorage.getItem("giabaoreg_accounts")) || [];
let selectedAcc = null;

function hasSupabase() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function sbRequest(path, method = "GET", body = null) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": method === "POST" ? "return=representation" : ""
        },
        body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    return method === "DELETE" ? null : res.json();
}

async function loadAccountsFromCloud() {
    localStorage.setItem("giabaoreg_accounts", JSON.stringify(accounts));
    if (hasSupabase()) {
        try {
            const rows = await sbRequest(`${SUPABASE_TABLE}?select=*&order=id.desc`);
            accounts = rows.map(r => ({
                id: r.id,
                code: r.code || "",
                title: r.title || "",
                price: Number(r.price) || 0,
                oldPrice: Number(r.old_price) || 0,
                rank: r.rank || "Không Rank",
                heroes: Number(r.heroes) || 0,
                skins: Number(r.skins) || 0,
                info: r.info || "Trắng thông tin",
                images: Array.isArray(r.images) ? r.images : [],
                desc: r.description || "",
                sold: Boolean(r.sold)
            }));
            localStorage.setItem("giabaoreg_accounts", JSON.stringify(accounts));
        } catch (err) {
            console.warn("Không tải được từ Supabase, dùng dữ liệu local:", err);
        }
    }
    updateStats();
    renderAccounts();
    renderAdminTable();
}

async function syncAccountToCloud(acc, isEdit = false) {
    localStorage.setItem("giabaoreg_accounts", JSON.stringify(accounts));
    if (!hasSupabase()) return;
    const payload = {
        code: acc.code,
        title: acc.title,
        price: acc.price,
        old_price: acc.oldPrice,
        rank: acc.rank,
        heroes: acc.heroes,
        skins: acc.skins,
        info: acc.info,
        images: acc.images,
        description: acc.desc,
        sold: acc.sold
    };
    if (isEdit && acc.id) {
        await sbRequest(`${SUPABASE_TABLE}?id=eq.${acc.id}`, "PATCH", payload);
    } else {
        const created = await sbRequest(`${SUPABASE_TABLE}`, "POST", payload);
        if (created && created[0]) acc.id = created[0].id;
    }
}

async function deleteAccountFromCloud(acc) {
    if (hasSupabase() && acc && acc.id) {
        await sbRequest(`${SUPABASE_TABLE}?id=eq.${acc.id}`, "DELETE");
    }
    localStorage.setItem("giabaoreg_accounts", JSON.stringify(accounts));
}

// ==========================================
// 2. HIỂN THỊ & BỘ LỌC
// ==========================================
function formatMoney(num) {
    return Number(num || 0).toLocaleString("vi-VN") + "đ";
}

function applyShopConfig() {
    document.title = `${shopConfig.shopName} - Giao Dịch Tự Động 24/7`;
    document.getElementById("nav-shop-name").textContent = shopConfig.shopName;
    document.getElementById("footer-shop-name").textContent = shopConfig.shopName;
    const zaloUrl = /^\d+$/.test(shopConfig.zalo.trim()) ? `https://zalo.me/${shopConfig.zalo.trim()}` : shopConfig.zalo;
    document.getElementById("nav-zalo-btn").href = zaloUrl;
    document.getElementById("footer-zalo").href = zaloUrl;
    document.getElementById("footer-fb").href = shopConfig.fb;
}

function updateStats() {
    const total = accounts.length;
    const sold = accounts.filter(a => a.sold).length;
    const available = total - sold;
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-available").textContent = available;
    document.getElementById("stat-sold").textContent = sold;
}

function renderAccounts() {
    const search = (document.getElementById("filter-search").value || "").toLowerCase().trim();
    const priceFilter = document.getElementById("filter-price").value;
    const rankFilter = document.getElementById("filter-rank").value;
    const statusFilter = document.getElementById("filter-status").value;

    const filtered = accounts.filter(acc => {
        const matchText = !search ||
            (acc.code || "").toLowerCase().includes(search) ||
            (acc.title || "").toLowerCase().includes(search) ||
            (acc.desc || "").toLowerCase().includes(search);

        let matchPrice = true;
        const p = Number(acc.price) || 0;
        if (priceFilter === "under100") matchPrice = p < 100000;
        else if (priceFilter === "100to300") matchPrice = p >= 100000 && p <= 300000;
        else if (priceFilter === "300to700") matchPrice = p > 300000 && p <= 700000;
        else if (priceFilter === "above700") matchPrice = p > 700000;

        const matchRank = rankFilter === "all" || acc.rank === rankFilter;
        const matchStatus = statusFilter === "all" ||
            (statusFilter === "available" && !acc.sold) ||
            (statusFilter === "sold" && acc.sold);

        return matchText && matchPrice && matchRank && matchStatus;
    });

    const grid = document.getElementById("accounts-grid");
    const empty = document.getElementById("empty-state");
    grid.innerHTML = "";

    if (filtered.length === 0) {
        empty.classList.remove("d-none");
        return;
    }
    empty.classList.add("d-none");

    filtered.forEach(acc => {
        const realIndex = accounts.indexOf(acc);
        const firstImg = (acc.images && acc.images[0]) ? acc.images[0] : "https://placehold.co/600x340/131c31/f59e0b?text=Lien+Quan+Mobile";
        const col = document.createElement("div");
        col.className = "col-sm-6 col-lg-4";
        col.innerHTML = `
            <div class="card gaming-card h-100 rounded-4 overflow-hidden text-white">
                <div class="position-relative">
                    <img src="${firstImg}" alt="${acc.title}" class="acc-thumb" onerror="this.src='https://placehold.co/600x340/131c31/f59e0b?text=Anh+Loi'">
                    <span class="badge ${acc.sold ? 'bg-danger' : 'bg-success'} position-absolute top-0 end-0 m-2">${acc.sold ? 'Đã Bán' : 'Còn Hàng'}</span>
                    <span class="badge bg-warning text-dark font-gaming position-absolute bottom-0 start-0 m-2">${acc.code}</span>
                </div>
                <div class="card-body d-flex flex-column p-3">
                    <h6 class="fw-bold text-white mb-2 text-truncate">${acc.title}</h6>
                    <div class="d-flex flex-wrap gap-2 small text-light opacity-75 mb-3">
                        <span><i class="fa-solid fa-trophy text-warning"></i> ${acc.rank}</span>
                        <span>•</span>
                        <span>${acc.heroes} Tướng</span>
                        <span>•</span>
                        <span>${acc.skins} Skin</span>
                    </div>
                    <div class="mt-auto d-flex align-items-center justify-content-between pt-2 border-top border-secondary">
                        <div>
                            <div class="font-gaming fw-bold text-warning fs-5">${formatMoney(acc.price)}</div>
                            ${acc.oldPrice ? `<small class="text-light opacity-50 text-decoration-line-through">${formatMoney(acc.oldPrice)}</small>` : ""}
                        </div>
                        <button onclick="openDetailModal(${realIndex})" class="btn btn-gold btn-sm px-3">Chi Tiết & Mua</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function resetFilters() {
    document.getElementById("filter-search").value = "";
    document.getElementById("filter-price").value = "all";
    document.getElementById("filter-rank").value = "all";
    document.getElementById("filter-status").value = "all";
    renderAccounts();
}

// ==========================================
// 3. CHI TIẾT & ĐẶT MUA
// ==========================================
function openDetailModal(index) {
    const acc = accounts[index];
    if (!acc) return;
    selectedAcc = acc;

    document.getElementById("modal-code").textContent = acc.code;
    document.getElementById("modal-title").textContent = acc.title;
    document.getElementById("modal-rank").textContent = acc.rank;
    document.getElementById("modal-heroes").textContent = `${acc.heroes} Tướng`;
    document.getElementById("modal-skins").textContent = `${acc.skins} Skin`;
    document.getElementById("modal-info").textContent = acc.info;
    document.getElementById("modal-desc").textContent = acc.desc || "Không có mô tả thêm.";
    document.getElementById("modal-price").textContent = formatMoney(acc.price);
    document.getElementById("modal-old-price").textContent = acc.oldPrice ? formatMoney(acc.oldPrice) : "";

    const gallery = document.getElementById("modal-gallery");
    gallery.innerHTML = "";
    const imgs = (acc.images && acc.images.length) ? acc.images : [];
    if (imgs.length === 0) {
        gallery.innerHTML = `<p class="small text-light opacity-75">Chưa có ảnh chụp kho đồ.</p>`;
    } else {
        imgs.forEach(url => {
            const div = document.createElement("div");
            div.className = "col-md-6";
            div.innerHTML = `<img src="${url}" class="gallery-img border border-secondary" onclick="zoomImage('${url}')">`;
            gallery.appendChild(div);
        });
    }

    new bootstrap.Modal(document.getElementById("detailModal")).show();
}

function zoomImage(url) {
    document.getElementById("lightbox-img").src = url;
    new bootstrap.Modal(document.getElementById("lightboxModal")).show();
}

function copyOrderAndOpen(channel) {
    if (!selectedAcc) return;
    const msg = `Chào shop ${shopConfig.shopName}, mình muốn mua acc mã ${selectedAcc.code} (${selectedAcc.title}) giá ${formatMoney(selectedAcc.price)}.`;
    navigator.clipboard?.writeText(msg).catch(() => {});
    const targetUrl = channel === "zalo" ? document.getElementById("nav-zalo-btn").href : shopConfig.fb;
    window.open(targetUrl, "_blank");
}

// ==========================================
// 4. QUẢN LÝ SHOP (ADMIN)
// ==========================================
function openAdminModal() {
    document.getElementById("admin-pass-input").value = "";
    document.getElementById("admin-login-view").classList.remove("d-none");
    document.getElementById("admin-dashboard-view").classList.add("d-none");
    new bootstrap.Modal(document.getElementById("adminModal")).show();
}

function checkAdminLogin() {
    const pass = document.getElementById("admin-pass-input").value;
    if (pass === shopConfig.adminPass) {
        document.getElementById("admin-login-view").classList.add("d-none");
        document.getElementById("admin-dashboard-view").classList.remove("d-none");
        document.getElementById("cfg-shop-name").value = shopConfig.shopName;
        document.getElementById("cfg-zalo").value = shopConfig.zalo;
        document.getElementById("cfg-fb").value = shopConfig.fb;
        document.getElementById("cfg-pass").value = shopConfig.adminPass;
        renderAdminTable();
    } else {
        alert("Sai mật khẩu!");
    }
}

function switchAdminTab(tab) {
    const isManage = tab === "manage";
    document.getElementById("admin-tab-manage").classList.toggle("d-none", !isManage);
    document.getElementById("admin-tab-settings").classList.toggle("d-none", isManage);
    document.getElementById("tab-btn-manage").classList.toggle("active", isManage);
    document.getElementById("tab-btn-settings").classList.toggle("active", !isManage);
}

async function saveAccountFromForm() {
    const idx = Number(document.getElementById("edit-acc-index").value);
    const code = document.getElementById("inp-code").value.trim();
    const title = document.getElementById("inp-title").value.trim();
    const price = Number(document.getElementById("inp-price").value);

    if (!code || !title || !price) {
        alert("Vui lòng nhập đầy đủ Mã Acc, Tiêu Đề và Giá Bán!");
        return;
    }

    const oldPrice = Number(document.getElementById("inp-old-price").value) || 0;
    const rank = document.getElementById("inp-rank").value;
    const heroes = Number(document.getElementById("inp-heroes").value) || 0;
    const skins = Number(document.getElementById("inp-skins").value) || 0;
    const info = document.getElementById("inp-info").value.trim() || "Trắng thông tin";
    const images = document.getElementById("inp-images").value
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
    const desc = document.getElementById("inp-desc").value.trim();

    if (idx >= 0 && accounts[idx]) {
        accounts[idx] = { ...accounts[idx], code, title, price, oldPrice, rank, heroes, skins, info, images, desc };
        await syncAccountToCloud(accounts[idx], true);
    } else {
        const newAcc = { code, title, price, oldPrice, rank, heroes, skins, info, images, desc, sold: false };
        accounts.unshift(newAcc);
        await syncAccountToCloud(newAcc, false);
    }

    resetAccountForm();
    updateStats();
    renderAccounts();
    renderAdminTable();
}

function editAccount(idx) {
    const acc = accounts[idx];
    if (!acc) return;
    document.getElementById("edit-acc-index").value = idx;
    document.getElementById("form-acc-heading").textContent = `✏️ Chỉnh Sửa Tài Khoản ${acc.code}`;
    document.getElementById("inp-code").value = acc.code;
    document.getElementById("inp-title").value = acc.title;
    document.getElementById("inp-price").value = acc.price;
    document.getElementById("inp-old-price").value = acc.oldPrice || "";
    document.getElementById("inp-rank").value = acc.rank;
    document.getElementById("inp-heroes").value = acc.heroes;
    document.getElementById("inp-skins").value = acc.skins;
    document.getElementById("inp-info").value = acc.info;
    document.getElementById("inp-images").value = (acc.images || []).join("\n");
    document.getElementById("inp-desc").value = acc.desc || "";
    document.getElementById("btn-cancel-edit").classList.remove("d-none");
}

function resetAccountForm() {
    document.getElementById("edit-acc-index").value = "-1";
    document.getElementById("form-acc-heading").textContent = "➕ Đăng Tài Khoản Mới Lên Shop";
    ["inp-code", "inp-title", "inp-price", "inp-old-price", "inp-heroes", "inp-skins", "inp-images", "inp-desc"].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById("inp-info").value = "Trắng thông tin";
    document.getElementById("btn-cancel-edit").classList.add("d-none");
}

async function toggleSold(idx) {
    const acc = accounts[idx];
    if (!acc) return;
    acc.sold = !acc.sold;
    await syncAccountToCloud(acc, true);
    updateStats();
    renderAccounts();
    renderAdminTable();
}

async function deleteAccount(idx) {
    const acc = accounts[idx];
    if (!acc || !confirm(`Xóa acc ${acc.code}?`)) return;
    accounts.splice(idx, 1);
    await deleteAccountFromCloud(acc);
    updateStats();
    renderAccounts();
    renderAdminTable();
}

function renderAdminTable() {
    const tbody = document.getElementById("admin-acc-list");
    if (!tbody) return;
    tbody.innerHTML = "";
    accounts.forEach((acc, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="p-3 fw-bold text-warning">${acc.code}</td>
            <td class="p-3">${acc.title}</td>
            <td class="p-3">${formatMoney(acc.price)}</td>
            <td class="p-3"><span class="badge ${acc.sold ? 'bg-danger' : 'bg-success'}">${acc.sold ? 'Đã Bán' : 'Còn Hàng'}</span></td>
            <td class="p-3 text-end">
                <button onclick="toggleSold(${idx})" class="btn btn-outline-info btn-sm me-1">${acc.sold ? 'Mở Bán' : 'Báo Đã Bán'}</button>
                <button onclick="editAccount(${idx})" class="btn btn-outline-warning btn-sm me-1">Sửa</button>
                <button onclick="deleteAccount(${idx})" class="btn btn-outline-danger btn-sm">Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function saveShopSettings() {
    shopConfig.shopName = document.getElementById("cfg-shop-name").value.trim() || DEFAULT_CONFIG.shopName;
    shopConfig.zalo = document.getElementById("cfg-zalo").value.trim() || DEFAULT_CONFIG.zalo;
    shopConfig.fb = document.getElementById("cfg-fb").value.trim() || DEFAULT_CONFIG.fb;
    shopConfig.adminPass = document.getElementById("cfg-pass").value.trim() || DEFAULT_CONFIG.adminPass;
    localStorage.setItem("giabaoreg_config", JSON.stringify(shopConfig));
    applyShopConfig();
    alert("Đã lưu cài đặt shop!");
}

// Bộ đếm online mô phỏng
setInterval(() => {
    const el = document.getElementById("online-count");
    if (!el) return;
    const current = Number(el.textContent) || 28;
    const next = Math.max(18, Math.min(45, current + (Math.random() > 0.5 ? 1 : -1)));
    el.textContent = next;
}, 5000);

applyShopConfig();
loadAccountsFromCloud();
