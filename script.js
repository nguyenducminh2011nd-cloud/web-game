function applyShopConfigToUI() {
  document.querySelectorAll("[data-shop-name]").forEach((el) => {
    el.textContent = shopConfig.shop_name || DEFAULT_CONFIG.shop_name;
  });

  const zaloHref = shopConfig.zalo || DEFAULT_CONFIG.zalo;
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

  const cfgNameInput = document.getElementById("cfgShopName");
  const cfgZaloInput = document.getElementById("cfgZalo");
  const cfgFbInput = document.getElementById("cfgFb");
  if (cfgNameInput) cfgNameInput.value = shopConfig.shop_name || "";
  if (cfgZaloInput) cfgZaloInput.value = zaloHref;
  if (cfgFbInput) cfgFbInput.value = fbHref;
}
