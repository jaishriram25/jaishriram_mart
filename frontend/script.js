
const API_URL = "https://jaishriram-mart.onrender.com/api";

let allProducts = [];
let currentCategory = "All";
let cart = JSON.parse(localStorage.getItem("jaishriram_cart") || "[]");

// ========================================
// API HELPER
// ========================================

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(options.body && !(options.body instanceof FormData)
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers
        }
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed: ${response.status}`
        );
    }

    return data;
}

// ========================================
// NOTIFICATION
// ========================================

function showMessage(message, isError = false) {
    let box = document.getElementById("mart-message");

    if (!box) {
        box = document.createElement("div");
        box.id = "mart-message";

        Object.assign(box.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: "99999",
            padding: "14px 20px",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#222222",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            maxWidth: "350px"
        });

        document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.borderLeft = isError
        ? "5px solid #dc2626"
        : "5px solid #16a34a";

    box.style.display = "block";
}

// ========================================
// LOAD PRODUCTS
// ========================================

async function loadProducts() {
    const grid = document.getElementById("product-grid");

    if (grid) {
        grid.innerHTML = "<p>Loading products...</p>";
    }

    try {
        const data = await apiRequest("/products");

        allProducts = Array.isArray(data)
            ? data
            : data.products || data.data || [];

        renderProducts();
        renderCategories();

    } catch (error) {
        console.error("Product loading error:", error);

        if (grid) {
            grid.innerHTML =
                "<p>Products could not be loaded. Please check the backend connection.</p>";
        }
    }
}

// ========================================
// PRODUCT IMAGE
// ========================================

function getProductImage(product) {
    const image = product.image_url ||
        product.image ||
        product.imageUrl ||
        "";

    if (!image) {
        return "../images/no-image.png";
    }

    if (
        image.startsWith("https://") ||
        image.startsWith("http://") ||
        image.startsWith("data:") ||
        image.startsWith("/")
    ) {
        return image;
    }

    return `../images/${image}`;
}

// ========================================
// RENDER PRODUCTS
// ========================================

function renderProducts() {
    const grid = document.getElementById("product-grid");

    if (!grid) return;

    const searchInput =
        document.getElementById("search-input") ||
        document.getElementById("search");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const filteredProducts = allProducts.filter(product => {
        const name = String(product.name || "").toLowerCase();
        const category = String(
            product.category || product.category_name || ""
        );

        const matchesSearch =
            name.includes(searchText) ||
            category.toLowerCase().includes(searchText);

        const matchesCategory =
            currentCategory === "All" ||
            category.toLowerCase() === currentCategory.toLowerCase();

        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = "<p>No products found.</p>";
        return;
    }

    grid.innerHTML = filteredProducts.map(product => {
        const id = product.id ?? product.product_id;
        const name = escapeHTML(product.name || "Product");
        const price = Number(product.price || 0);
        const quantity = Number(
            product.quantity ?? product.stock ?? 0
        );
        const image = getProductImage(product);

        return `
            <div class="product-card">
                <img
                    src="${escapeHTML(image)}"
                    alt="${name}"
                    class="product-image"
                    onerror="this.onerror=null;this.src='https://placehold.co/300x220?text=Product'"
                >

                <h3>${name}</h3>

                <p class="product-price">
                    ₹${price.toFixed(2)}
                </p>

                <p class="product-stock">
                    ${quantity > 0 ? "In Stock" : "Out of Stock"}
                </p>

                <button
                    type="button"
                    onclick="addToCart(${JSON.stringify(String(id))})"
                    ${quantity <= 0 ? "disabled" : ""}
                >
                    Add to Cart
                </button>
            </div>
        `;
    }).join("");
}

// ========================================
// SAFE HTML TEXT
// ========================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ========================================
// LOAD CATEGORIES
// ========================================

async function renderCategories() {
    const container =
        document.getElementById("category-list") ||
        document.getElementById("categories");

    const select = document.getElementById("category-filter");

    let categories = [
        ...new Set(
            allProducts
                .map(product =>
                    product.category || product.category_name
                )
                .filter(Boolean)
        )
    ];

    try {
        const data = await apiRequest("/categories");

        const apiCategories = Array.isArray(data)
            ? data
            : data.categories || data.data || [];

        categories = [
            ...new Set([
                ...categories,
                ...apiCategories.map(category =>
                    typeof category === "string"
                        ? category
                        : category.name || category.category
                ).filter(Boolean)
            ])
        ];
    } catch (error) {
        console.warn("Could not load API categories:", error.message);
    }

    if (container) {
        container.innerHTML = ["All", ...categories].map(category => `
            <button
                type="button"
                class="category-button"
                onclick="filterCategory(${JSON.stringify(category)})"
            >
                ${escapeHTML(category)}
            </button>
        `).join("");
    }

    if (select) {
        select.innerHTML = `
            <option value="All">All Categories</option>
            ${categories.map(category => `
                <option value="${escapeHTML(category)}">
                    ${escapeHTML(category)}
                </option>
            `).join("")}
        `;

        select.value = currentCategory;
    }
}

function filterCategory(category) {
    currentCategory = category;
    renderProducts();
}

function searchProducts() {
    renderProducts();
}

// ========================================
// CART
// ========================================

function saveCart() {
    localStorage.setItem(
        "jaishriram_cart",
        JSON.stringify(cart)
    );

    renderCart();
}

function addToCart(productId) {
    const product = allProducts.find(item =>
        String(item.id ?? item.product_id) === String(productId)
    );

    if (!product) {
        showMessage("Product not found. Reload the page.", true);
        return;
    }

    const stock = Number(product.quantity ?? product.stock ?? 0);

    if (stock <= 0) {
        showMessage("This product is out of stock.", true);
        return;
    }

    const existingItem = cart.find(item =>
        String(item.id) === String(productId)
    );

    if (existingItem) {
        if (existingItem.quantity >= stock) {
            showMessage("Available stock limit reached.", true);
            return;
        }

        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id ?? product.product_id,
            name: product.name,
            price: Number(product.price || 0),
            image: getProductImage(product),
            quantity: 1
        });
    }

    saveCart();
    showMessage("Product added to cart!");
}

function removeFromCart(productId) {
    cart = cart.filter(item =>
        String(item.id) !== String(productId)
    );

    saveCart();
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item =>
        String(item.id) === String(productId)
    );

    if (!item) return;

    const newQuantity = Number(quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    const product = allProducts.find(product =>
        String(product.id ?? product.product_id) === String(productId)
    );

    const stock = product
        ? Number(product.quantity ?? product.stock ?? 0)
        : newQuantity;

    item.quantity = Math.min(newQuantity, stock);

    saveCart();
}

function renderCart() {
    const cartContainer =
        document.getElementById("cart-items") ||
        document.getElementById("cart-container");

    const countElement = document.getElementById("cart-count");
    const totalElement = document.getElementById("cart-total");

    const totalItems = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    const totalPrice = cart.reduce(
        (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
    );

    if (countElement) {
        countElement.textContent = totalItems;
    }

    if (totalElement) {
        totalElement.textContent = `₹${totalPrice.toFixed(2)}`;
    }

    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img
                src="${escapeHTML(item.image || "")}"
                alt="${escapeHTML(item.name)}"
                width="65"
                onerror="this.style.display='none'"
            >

            <div>
                <h4>${escapeHTML(item.name)}</h4>

                <p>₹${Number(item.price).toFixed(2)}</p>

                <label>
                    Quantity:
                    <input
                        type="number"
                        min="1"
                        value="${Number(item.quantity)}"
                        onchange="updateCartQuantity(
                            ${JSON.stringify(String(item.id))},
                            this.value
                        )"
                    >
                </label>

                <button
                    type="button"
                    onclick="removeFromCart(
                        ${JSON.stringify(String(item.id))}
                    )"
                >
                    Remove
                </button>
            </div>
        </div>
    `).join("");
}

// ========================================
// LOGIN
// ========================================

async function loginUser(event) {
    if (event) event.preventDefault();

    const emailElement = document.getElementById("login-email");
    const passwordElement = document.getElementById("login-password");

    if (!emailElement || !passwordElement) {
        showMessage("Login form fields were not found.", true);
        return;
    }

    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (!email || !password) {
        showMessage("Enter your email and password.", true);
        return;
    }

    try {
        const data = await apiRequest("/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (data.token) {
            localStorage.setItem("authToken", data.token);
        }

        if (data.user) {
            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(data.user)
            );
        }

        showMessage(data.message || "Login successful!");
    } catch (error) {
        console.error("Login error:", error);
        showMessage(
            `Login failed: ${error.message}`,
            true
        );
    }
}

// ========================================
// REGISTER
// ========================================

async function registerUser(event) {
    if (event) event.preventDefault();

    const nameElement = document.getElementById("register-name");
    const emailElement = document.getElementById("register-email");
    const passwordElement = document.getElementById("register-password");

    if (!nameElement || !emailElement || !passwordElement) {
        showMessage("Registration form fields were not found.", true);
        return;
    }

    const name = nameElement.value.trim();
    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (!name || !email || !password) {
        showMessage("Please fill in all registration fields.", true);
        return;
    }

    try {
        const data = await apiRequest("/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        showMessage(data.message || "Registration successful!");
    } catch (error) {
        console.error("Registration error:", error);
        showMessage(
            `Registration failed: ${error.message}`,
            true
        );
    }
}

// ========================================
// PLACE ORDER
// ========================================

async function placeOrder(event) {
    if (event) event.preventDefault();

    if (cart.length === 0) {
        showMessage("Your cart is empty.", true);
        return;
    }

    const token = localStorage.getItem("authToken");

    const order = {
        items: cart.map(item => ({
            product_id: item.id,
            quantity: Number(item.quantity)
        })),
        total: cart.reduce(
            (sum, item) =>
                sum + Number(item.price) * Number(item.quantity),
            0
        )
    };

    try {
        const data = await apiRequest("/orders", {
            method: "POST",
            headers: token
                ? { Authorization: `Bearer ${token}` }
                : {},
            body: JSON.stringify(order)
        });

        cart = [];
        saveCart();

        showMessage(data.message || "Order placed successfully!");
        await loadProducts();
    } catch (error) {
        console.error("Order error:", error);
        showMessage(
            `Order failed: ${error.message}`,
            true
        );
    }
}

// ========================================
// LOGOUT
// ========================================

function logoutUser() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("loggedInUser");

    showMessage("Logged out successfully.");
}

// ========================================
// INITIALIZE WEBSITE
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    renderCart();

    const searchInput =
        document.getElementById("search-input") ||
        document.getElementById("search");

    if (searchInput) {
        searchInput.addEventListener("input", searchProducts);
    }

    const categorySelect =
        document.getElementById("category-filter");

    if (categorySelect) {
        categorySelect.addEventListener("change", event => {
            filterCategory(event.target.value);
        });
    }

    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", loginUser);
    }

    const registerForm =
        document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", registerUser);
    }

    const orderForm = document.getElementById("order-form");

    if (orderForm) {
        orderForm.addEventListener("submit", placeOrder);
    }
});
