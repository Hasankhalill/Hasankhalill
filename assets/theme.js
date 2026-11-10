document.documentElement.classList.add("js");

const configNode = document.getElementById("hycare-config");
const config = configNode ? JSON.parse(configNode.textContent) : {};

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const menuClose = document.querySelector("[data-menu-close]");
const mobileQuery = window.matchMedia("(max-width: 989px)");

function setMenu(open) {
  if (!header || !nav || !menuToggle) return;
  header.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (mobileQuery.matches) nav.inert = !open;
  else nav.inert = false;
  if (open) {
    const closeButton = nav.querySelector("[data-menu-close]");
    if (closeButton) closeButton.focus();
  }
}

function syncNav() {
  if (!mobileQuery.matches) setMenu(false);
  else if (header && !header.classList.contains("is-open") && nav) nav.inert = true;
}

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    setMenu(!header.classList.contains("is-open"));
  });
}

if (menuClose) {
  menuClose.addEventListener("click", () => {
    setMenu(false);
    menuToggle.focus();
  });
}

mobileQuery.addEventListener("change", syncNav);
syncNav();

function closeDepartments(except) {
  document.querySelectorAll(".dept.is-open").forEach((item) => {
    if (item === except) return;
    item.classList.remove("is-open");
    const toggle = item.querySelector(".dept__toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
}

document.querySelectorAll(".dept__toggle").forEach((toggle) => {
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));
  if (panel && panel.children.length === 0) toggle.hidden = true;
  toggle.addEventListener("click", () => {
    const dept = toggle.closest(".dept");
    const open = !dept.classList.contains("is-open");
    closeDepartments(open ? dept : null);
    dept.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".dept")) closeDepartments();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeDepartments();
  if (header && header.classList.contains("is-open")) {
    setMenu(false);
    if (menuToggle) menuToggle.focus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || !header || !header.classList.contains("is-open") || !mobileQuery.matches) return;
  const focusable = nav.querySelectorAll("a, button, input, select, textarea");
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

class PredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector(".predictive__results");
    if (!this.input || !this.results) return;
    this.input.addEventListener("input", this.debounce(() => this.onChange(), 250));
    this.input.addEventListener("focus", () => {
      if (this.results.innerHTML.trim()) this.open();
    });
  }

  onChange() {
    const term = this.input.value.trim();
    if (!term.length) {
      this.close();
      return;
    }
    this.getResults(term);
  }

  getResults(term) {
    if (this.controller) this.controller.abort();
    this.controller = new AbortController();
    const params = new URLSearchParams();
    params.set("q", term);
    params.set("section_id", "predictive-search");
    params.set("resources[type]", "product,collection,query,page,article");
    params.set("resources[limit]", "6");
    params.set("resources[limit_scope]", "each");
    fetch(`${this.dataset.predictiveUrl}?${params}`, { signal: this.controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(response.status);
        return response.text();
      })
      .then((text) => {
        const parsed = new DOMParser().parseFromString(text, "text/html");
        const markup = parsed.querySelector("#shopify-section-predictive-search");
        this.results.innerHTML = markup ? markup.innerHTML : "";
        if (this.results.innerHTML.trim()) this.open();
        else this.close();
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        this.close();
      });
  }

  open() {
    this.results.hidden = false;
    this.input.setAttribute("aria-expanded", "true");
  }

  close() {
    this.results.hidden = true;
    this.results.innerHTML = "";
    this.input.setAttribute("aria-expanded", "false");
  }

  debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }
}

if (!customElements.get("predictive-search")) {
  customElements.define("predictive-search", PredictiveSearch);
}

const cartDialog = document.querySelector("[data-cart-drawer]");
const cartLink = document.querySelector("[data-cart-link]");

function openCart() {
  if (!cartDialog || !cartDialog.showModal) return;
  if (!cartDialog.open) cartDialog.showModal();
}

if (cartLink) {
  cartLink.addEventListener("click", (event) => {
    if (!cartDialog || !cartDialog.showModal) return;
    event.preventDefault();
    openCart();
  });
}

async function refreshCart() {
  if (!config.root || !config.cartJs) return;
  const [cartResponse, sectionResponse] = await Promise.all([
    fetch(config.cartJs, { headers: { Accept: "application/json" } }),
    fetch(`${config.root}?sections=${config.cartSection}`, { headers: { Accept: "application/json" } })
  ]);
  if (cartResponse.ok) {
    const cart = await cartResponse.json();
    document.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = cart.item_count;
    });
    if (cartLink) {
      cartLink.setAttribute("aria-label", (config.cartLabel || "").replace("[[count]]", cart.item_count));
    }
  }
  if (sectionResponse.ok && cartDialog) {
    const sections = await sectionResponse.json();
    const html = sections[config.cartSection];
    if (html) {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const next = parsed.querySelector(".cart-drawer__inner");
      const current = cartDialog.querySelector(".cart-drawer__inner");
      if (next && current) current.replaceWith(next);
    }
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-qty]");
  if (!button) return;
  const wrap = button.closest(".qty");
  const input = wrap ? wrap.querySelector("input") : null;
  if (!input) return;
  const min = Number(input.min || 0);
  const next = Number(input.value || 0) + Number(button.dataset.qty);
  input.value = String(Math.max(min, next));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

document.querySelectorAll("[data-product-form]").forEach((form) => {
  const status = form.querySelector("[data-product-status]");
  const select = form.querySelector("[data-variant-select]");
  const price = form.querySelector("[data-product-price]");
  const compare = form.querySelector("[data-product-compare]");
  const button = form.querySelector("[data-add-button]");
  const stage = form.closest(".product") ? form.closest(".product").querySelector("[data-gallery-stage] img") : null;

  if (select) {
    select.addEventListener("change", () => {
      const option = select.selectedOptions[0];
      if (!option) return;
      if (price) price.textContent = option.dataset.price || "";
      if (compare) {
        compare.textContent = option.dataset.compare || "";
        compare.hidden = !option.dataset.compare;
      }
      if (button) {
        const available = option.dataset.available === "true";
        button.disabled = !available;
        button.textContent = available ? button.dataset.addLabel : button.dataset.soldLabel;
      }
      if (stage && option.dataset.image) stage.src = option.dataset.image;
    });
  }

  form.addEventListener("submit", async (event) => {
    const submitter = event.submitter;
    if (submitter && !submitter.hasAttribute("data-add-button")) return;
    if (!config.cartAdd || !window.fetch) return;
    event.preventDefault();
    const data = new FormData(form);
    const payload = { id: data.get("id"), quantity: data.get("quantity") || 1 };
    if (button) button.disabled = true;
    try {
      const response = await fetch(`${config.cartAdd}.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.description || body.message || form.dataset.error);
      if (status) status.textContent = form.dataset.added || "";
      await refreshCart();
      openCart();
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      if (button && select) {
        const option = select.selectedOptions[0];
        button.disabled = option ? option.dataset.available !== "true" : false;
      } else if (button) {
        button.disabled = false;
      }
    }
  });
});
