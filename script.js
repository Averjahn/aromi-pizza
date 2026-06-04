// ===== Состояние корзины (с сохранением в localStorage) =====
const STORAGE_KEY = "aromi_cart";
let cart = loadCart();

function loadCart() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

// ===== Хелперы =====
const $ = (sel) => document.querySelector(sel);
const money = (n) => n.toLocaleString("ru-RU");
const getPizza = (id) => PIZZAS.find((p) => p.id === id);

// ===== Рендер меню + фильтры =====
let activeFilter = "Все";

// Категории берём из data.js (CATEGORIES), оставляя только реально присутствующие
function categories() {
  const present = new Set(PIZZAS.map((p) => p.cat));
  const base = (typeof CATEGORIES !== "undefined") ? CATEGORIES : ["Все"];
  return base.filter((c) => c === "Все" || present.has(c));
}

function renderFilters() {
  const box = $("#filters");
  box.innerHTML = "";
  categories().forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter" + (cat === activeFilter ? " active" : "");
    btn.textContent = cat;
    btn.onclick = () => { activeFilter = cat; renderFilters(); renderMenu(); };
    box.appendChild(btn);
  });
}

function renderMenu() {
  const grid = $("#grid");
  grid.innerHTML = "";
  const list = activeFilter === "Все"
    ? PIZZAS
    : PIZZAS.filter((p) => p.cat === activeFilter);

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card__media">
        <img class="card__img" src="${p.img}" alt="${p.name}" loading="lazy">
        <span class="card__price">${money(p.price)} ₽</span>
      </div>
      <div class="card__body">
        <div class="card__tags"><span class="tag">${p.cat}</span></div>
        <h3 class="card__name">${p.name}</h3>
        <p class="card__desc">${p.desc}</p>
        <button class="card__add" data-id="${p.id}">Добавить в корзину</button>
      </div>`;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".card__add").forEach((btn) => {
    btn.onclick = () => addToCart(Number(btn.dataset.id), btn);
  });
}

// ===== Логика корзины =====
function addToCart(id, btn) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  updateCartUI();
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = "Добавлено ✓";
    setTimeout(() => (btn.textContent = orig), 800);
  }
}
function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
  updateCartUI();
}
function removeItem(id) {
  delete cart[id];
  saveCart();
  updateCartUI();
}

function cartEntries() {
  return Object.keys(cart).map((id) => ({ pizza: getPizza(Number(id)), qty: cart[id] }));
}
function cartTotal() {
  return cartEntries().reduce((sum, e) => sum + e.pizza.price * e.qty, 0);
}
function cartCount() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function updateCartUI() {
  $("#cartCount").textContent = cartCount();
  $("#cartTotal").textContent = money(cartTotal());

  const box = $("#cartItems");
  const entries = cartEntries();
  if (entries.length === 0) {
    box.innerHTML = `<p class="cart-empty">Корзина пуста 🍕<br>Добавьте пиццу из меню!</p>`;
    $("#checkoutBtn").disabled = true;
    $("#checkoutBtn").style.opacity = .5;
    return;
  }
  $("#checkoutBtn").disabled = false;
  $("#checkoutBtn").style.opacity = 1;

  box.innerHTML = "";
  entries.forEach(({ pizza, qty }) => {
    const row = document.createElement("div");
    row.className = "ci";
    row.innerHTML = `
      <img class="ci__img" src="${pizza.img}" alt="${pizza.name}">
      <div class="ci__info">
        <div class="ci__name">${pizza.name}</div>
        <div class="ci__price">${money(pizza.price)} ₽ × ${qty} = ${money(pizza.price * qty)} ₽</div>
        <div class="ci__controls">
          <button class="qty-btn" data-id="${pizza.id}" data-d="-1">−</button>
          <span class="ci__qty">${qty}</span>
          <button class="qty-btn" data-id="${pizza.id}" data-d="1">+</button>
          <button class="ci__remove" data-id="${pizza.id}">Удалить</button>
        </div>
      </div>`;
    box.appendChild(row);
  });

  box.querySelectorAll(".qty-btn").forEach((b) => {
    b.onclick = () => changeQty(Number(b.dataset.id), Number(b.dataset.d));
  });
  box.querySelectorAll(".ci__remove").forEach((b) => {
    b.onclick = () => removeItem(Number(b.dataset.id));
  });
}

// ===== Открытие/закрытие панелей =====
function openCart() { $("#cart").classList.add("open"); $("#overlay").classList.add("open"); }
function closeCart() { $("#cart").classList.remove("open"); $("#overlay").classList.remove("open"); }
function openOrder() {
  $("#orderTotal").textContent = money(cartTotal());
  $("#orderForm").hidden = false;
  $("#orderSuccess").hidden = true;
  $("#orderModal").classList.add("open");
}
function closeOrder() { $("#orderModal").classList.remove("open"); }

// Высота хедера → CSS-переменная, чтобы триколор прилипал ровно под ним
function syncHeaderHeight() {
  const h = document.querySelector(".header");
  if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
}

// ===== События =====
document.addEventListener("DOMContentLoaded", () => {
  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);
  renderFilters();
  renderMenu();
  updateCartUI();

  $("#cartBtn").onclick = openCart;
  $("#cartClose").onclick = closeCart;
  $("#overlay").onclick = closeCart;

  $("#checkoutBtn").onclick = () => { if (cartCount() > 0) { closeCart(); openOrder(); } };
  $("#orderClose").onclick = closeOrder;

  $("#orderForm").onsubmit = (e) => {
    e.preventDefault();
    // В реальном проекте здесь был бы запрос на сервер.
    const data = Object.fromEntries(new FormData(e.target).entries());
    console.log("Заказ оформлен:", { ...data, items: cartEntries(), total: cartTotal() });
    cart = {};
    saveCart();
    updateCartUI();
    $("#orderForm").hidden = true;
    $("#orderSuccess").hidden = false;
    e.target.reset();
  };
  $("#successClose").onclick = closeOrder;
});
