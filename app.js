const API = "https://api.escuelajs.co/api/v1";

let products = [];
let filtered = [];
let categories = [];
let page = 1;
let perPage = 10;
let sortBy = null;
let sortDir = "asc";

// Elements
const loading = document.getElementById("loading");
const tableWrapper = document.getElementById("tableWrapper");
const tableBody = document.getElementById("tableBody");
const pagination = document.getElementById("pagination");
const info = document.getElementById("info");
const searchInput = document.getElementById("searchInput");
const pageSizeSelect = document.getElementById("pageSizeSelect");

// Modals
let detailModal, createModal;

// Init
document.addEventListener("DOMContentLoaded", () => {
  detailModal = new bootstrap.Modal(document.getElementById("detailModal"));
  createModal = new bootstrap.Modal(document.getElementById("createModal"));
  init();
});

async function init() {
  await loadCategories();
  await loadProducts();
  setupEvents();
}

// Load products
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    products = await res.json();
    filtered = [...products];
    render();
    loading.style.display = "none";
    tableWrapper.style.display = "block";
  } catch (e) {
    showToast("Lỗi", "Không thể tải dữ liệu", "error");
  }
}

// Load categories
async function loadCategories() {
  try {
    const res = await fetch(`${API}/categories`);
    categories = await res.json();
    const options = categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    document.getElementById("editCategory").innerHTML = options;
    document.getElementById("createCategory").innerHTML = options;
  } catch (e) {
    console.error(e);
  }
}

// Setup events
function setupEvents() {
  // Search
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    filtered = q
      ? products.filter((p) => p.title.toLowerCase().includes(q))
      : [...products];
    page = 1;
    doSort();
    render();
  });

  // Page size
  pageSizeSelect.addEventListener("change", () => {
    perPage = parseInt(pageSizeSelect.value);
    page = 1;
    render();
  });

  // Sort
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const field = btn.dataset.sort;
      if (sortBy === field) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortBy = field;
        sortDir = "asc";
      }
      document
        .querySelectorAll(".sort-btn")
        .forEach((b) => b.classList.remove("asc", "desc"));
      btn.classList.add(sortDir);
      doSort();
      render();
    });
  });

  // Create button
  document.getElementById("btnCreate").addEventListener("click", () => {
    document.getElementById("createTitle").value = "";
    document.getElementById("createPrice").value = "";
    document.getElementById("createDescription").value = "";
    document.getElementById("createImages").value = "";
    createModal.show();
  });

  // Save new product
  document.getElementById("btnSave").addEventListener("click", createProduct);

  // Update product
  document.getElementById("btnUpdate").addEventListener("click", updateProduct);

  // Export CSV
  document.getElementById("btnExport").addEventListener("click", exportCSV);
}

// Sort
function doSort() {
  if (!sortBy) return;
  filtered.sort((a, b) => {
    let va = a[sortBy];
    let vb = b[sortBy];
    if (sortBy === "price") {
      va = Number(va);
      vb = Number(vb);
    } else {
      va = (va || "").toLowerCase();
      vb = (vb || "").toLowerCase();
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

// Render table
function render() {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const items = filtered.slice(start, end);

  tableBody.innerHTML = items
    .map(
      (p) => `
        <tr class="row-tooltip" data-desc="${escapeAttr(p.description || "Không có mô tả")}" onclick="openDetail(${p.id})">
            <td class="text-center"><strong>#${p.id}</strong></td>
            <td>${escapeHtml(p.title)}</td>
            <td class="text-end">$${Number(p.price).toFixed(2)}</td>
            <td class="text-center">
                <span class="badge badge-category" style="background:${getColor(p.category?.id)}">
                    ${escapeHtml(p.category?.name || "N/A")}
                </span>
            </td>
            <td class="text-center">
                ${p.images?.length ? `<img src="${cleanUrl(p.images[0])}" class="product-img" onerror="this.outerHTML='<div class=no-img>No Image</div>'">` : '<div class="no-img">No Image</div>'}
            </td>
        </tr>
    `,
    )
    .join("");

  renderPagination();
  info.textContent = `Hiển thị ${start + 1}-${Math.min(end, filtered.length)} / ${filtered.length} sản phẩm`;
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filtered.length / perPage);
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = `
        <li class="page-item ${page === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="goPage(${page - 1}); return false;">&laquo;</a>
        </li>
    `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      html += `
                <li class="page-item ${i === page ? "active" : ""}">
                    <a class="page-link" href="#" onclick="goPage(${i}); return false;">${i}</a>
                </li>
            `;
    } else if (i === page - 3 || i === page + 3) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  html += `
        <li class="page-item ${page === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="goPage(${page + 1}); return false;">&raquo;</a>
        </li>
    `;

  pagination.innerHTML = html;
}

function goPage(p) {
  const totalPages = Math.ceil(filtered.length / perPage);
  if (p < 1 || p > totalPages) return;
  page = p;
  render();
}

// Open detail modal
function openDetail(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("editId").value = p.id;
  document.getElementById("editTitle").value = p.title;
  document.getElementById("editPrice").value = p.price;
  document.getElementById("editDescription").value = p.description || "";
  document.getElementById("editCategory").value = p.category?.id || "";
  document.getElementById("editImages").value = (p.images || [])
    .map(cleanUrl)
    .join("\n");

  // Carousel
  const carousel = document.getElementById("carouselInner");
  if (p.images?.length) {
    carousel.innerHTML = p.images
      .map(
        (img, i) => `
            <div class="carousel-item ${i === 0 ? "active" : ""}">
                <img src="${cleanUrl(img)}" class="d-block w-100" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            </div>
        `,
      )
      .join("");
  } else {
    carousel.innerHTML = `<div class="carousel-item active"><img src="https://via.placeholder.com/300?text=No+Image" class="d-block w-100"></div>`;
  }

  detailModal.show();
}

// Update product
async function updateProduct() {
  const id = document.getElementById("editId").value;
  const title = document.getElementById("editTitle").value.trim();
  const price = Number(document.getElementById("editPrice").value);
  const description = document.getElementById("editDescription").value.trim();
  const categoryId = Number(document.getElementById("editCategory").value);
  const imagesText = document.getElementById("editImages").value.trim();

  // Parse images
  let images = imagesText
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s);

  // Validation
  if (!title) {
    showToast("Lỗi", "Vui lòng nhập Title", "error");
    return;
  }
  if (!price || price <= 0) {
    showToast("Lỗi", "Vui lòng nhập Price hợp lệ", "error");
    return;
  }
  if (!description) {
    showToast("Lỗi", "Vui lòng nhập Description", "error");
    return;
  }

  // Validate URL format nếu có images
  const urlPattern = /^https?:\/\/.+/i;
  for (let img of images) {
    if (!urlPattern.test(img)) {
      showToast(
        "Lỗi",
        "URL hình ảnh không hợp lệ. Phải bắt đầu bằng http:// hoặc https://",
        "error",
      );
      return;
    }
  }

  // Nếu không có images, dùng placeholder
  if (images.length === 0) {
    images = ["https://via.placeholder.com/300"];
  }

  const data = { title, price, description, categoryId, images };

  try {
    const res = await fetch(`${API}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      const idx = products.findIndex((p) => p.id == id);
      if (idx >= 0) products[idx] = { ...products[idx], ...updated };
      filtered = [...products];
      if (searchInput.value) {
        const q = searchInput.value.toLowerCase();
        filtered = products.filter((p) => p.title.toLowerCase().includes(q));
      }
      doSort();
      render();
      detailModal.hide();
      showToast("Thành công", "Đã cập nhật sản phẩm!", "success");
    } else {
      const errorData = await res.json().catch(() => ({}));
      showToast(
        "Lỗi",
        errorData.message || "Không thể cập nhật. Kiểm tra lại thông tin.",
        "error",
      );
    }
  } catch (e) {
    console.error(e);
    showToast("Lỗi", "Không thể kết nối đến server", "error");
  }
}

// Create product
async function createProduct() {
  const title = document.getElementById("createTitle").value.trim();
  const price = Number(document.getElementById("createPrice").value);
  const description = document.getElementById("createDescription").value.trim();
  const categoryId = Number(document.getElementById("createCategory").value);
  const imagesText = document.getElementById("createImages").value.trim();

  // Parse images - mỗi dòng là 1 URL
  let images = imagesText
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s);

  // Validation
  if (!title) {
    showToast("Lỗi", "Vui lòng nhập Title", "error");
    return;
  }
  if (!price || price <= 0) {
    showToast("Lỗi", "Vui lòng nhập Price hợp lệ", "error");
    return;
  }
  if (!description) {
    showToast("Lỗi", "Vui lòng nhập Description", "error");
    return;
  }
  if (images.length === 0) {
    showToast("Lỗi", "Vui lòng nhập ít nhất 1 URL hình ảnh", "error");
    return;
  }

  // Validate URL format
  const urlPattern = /^https?:\/\/.+/i;
  for (let img of images) {
    if (!urlPattern.test(img)) {
      showToast(
        "Lỗi",
        "URL hình ảnh không hợp lệ. Phải bắt đầu bằng http:// hoặc https://",
        "error",
      );
      return;
    }
  }

  const data = { title, price, description, categoryId, images };

  try {
    const res = await fetch(`${API}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const newProduct = await res.json();
      products.unshift(newProduct);
      filtered = [...products];
      page = 1;
      render();
      createModal.hide();
      showToast("Thành công", "Đã tạo sản phẩm mới!", "success");
    } else {
      const errorData = await res.json().catch(() => ({}));
      showToast(
        "Lỗi",
        errorData.message || "Không thể tạo sản phẩm. Kiểm tra lại thông tin.",
        "error",
      );
    }
  } catch (e) {
    console.error(e);
    showToast("Lỗi", "Không thể kết nối đến server", "error");
  }
}

// Export CSV
function exportCSV() {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const items = filtered.slice(start, end);

  if (!items.length) {
    showToast("Thông báo", "Không có dữ liệu để xuất", "error");
    return;
  }

  const headers = ["ID", "Title", "Price", "Category", "Description", "Images"];
  const rows = items.map((p) => [
    p.id,
    `"${(p.title || "").replace(/"/g, '""')}"`,
    p.price,
    `"${(p.category?.name || "").replace(/"/g, '""')}"`,
    `"${(p.description || "").replace(/"/g, '""')}"`,
    `"${(p.images || []).join("; ")}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  showToast("Thành công", `Đã xuất ${items.length} sản phẩm`, "success");
}

// Toast
function showToast(title, msg, type) {
  const toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastBody").textContent = msg;
  toast.className = "toast " + type;
  new bootstrap.Toast(toast).show();
}

// Helpers
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function cleanUrl(url) {
  if (!url) return "";
  return url.replace(/[\[\]"]/g, "").trim();
}

function getColor(id) {
  const colors = [
    "#3498db",
    "#e74c3c",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
  ];
  return colors[(id || 0) % colors.length];
}
