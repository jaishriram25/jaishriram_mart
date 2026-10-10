
let allProducts = [];
let currentCategory = "All";

// ========================================
// PRODUCT IMAGE MAPPING
// ========================================

function getProductImage(product) {
    const image = typeof product.image === "string"
        ? product.image.trim()
        : "";

    if (!image) return "";

    if (/^https?:\/\//i.test(image) || image.startsWith("data:")) {
        return image;
    }

    const fileName = image.split(/[\\/]/).pop().toLowerCase();

    const imageMap = {
        "smartwatch.jpg": "smart-watch.jpg",
        "headphones.jpg": "wireless-headphones.jpg",
        "backpack.jpg": "college-backpack.jpg",
        "shoes.jpg": "running-shoes.jpg",
        "speaker.jpg": "bluetooth-speaker.jpg",
        "keyboard.jpg": "usb-keyboard.jpg",
        "mouse.jpg": "wireless-mouse.jpg",
        "powerbank.jpg": "mobile-charger.jpg",
        "charger.jpg": "mobile-charger.jpg",
        "cable.jpg": "usb-type-c-cable.jpg",
        "laptopstand.jpg": "laptop-stand.jpg",
        "bottle.jpg": "water-bottle.jpg",
        "notebook.jpg": "college-notebook.jpg",
        "pens.jpg": "college-notebook.jpg",
        "schoolbag.jpg": "school-backpack.jpg",
        "cap.jpg": "sports-cap.jpg",
        "tshirt.jpg": "cotton-t-shirt.jpg",
        "trackpants.jpg": "running-shoes.jpg",
        "casualshoes.jpg": "casual-shoes.jpg",
        "football.jpg": "football.jpg",
        "bat.jpg": "cricket-bat.jpg",
        "yogamat.jpg": "yoga-mat.jpg",
        "desklamp.jpg": "desk-lamp.jpg",
        "studytable.jpg": "study-table.jpg",
        "travelbag.jpg": "travel-bag.jpg",
        "sunglasses.jpg": "sunglasses.jpg",
        "wireless-mouse.jpg": "wireless-mouse.jpg"
    };

    const actualFile = imageMap[fileName] || fileName;

    // images folder is beside frontend folder
    return "../images/" + actualFile;
}

// ========================================
// IMAGE ERROR HANDLER
// ========================================

function handleImageError(imageElement) {
    if (!imageElement) return;

    console.error("Image failed to load:", imageElement.src);

    imageElement.onerror = null;

    const parent = imageElement.parentElement;

    if (parent) {
        parent.innerHTML =
            '<div class="image-placeholder">🛍️</div>';
    }
}

// ========================================
// LOAD PRODUCTS
// ========================================

async function loadProducts() {
    const productGrid = document.getElementById("product-grid");

    if (!productGrid) return;

    productGrid.innerHTML =
        '<p class="loading-message">Loading products...</p>';

    try {
        const response = await fetch(
            "http://localhost:8080/api/products",
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Invalid product data");
        }

        allProducts = products;
        displayProducts(allProducts);

    } catch (error) {
        console.error("Product loading error:", error);

        productGrid.innerHTML = `
            <div class="error-message">
                <h3>Unable to load products</h3>
                <p>Please make sure Jai Mart backend is running.</p>
            </div>
        `;
    }
}

// ========================================
// DISPLAY PRODUCTS
// ========================================

function displayProducts(products) {
    const productGrid = document.getElementById("product-grid");

    if (!productGrid) return;

    if (!products || products.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products">
                <h3>No products found</h3>
                <p>Try another category or search.</p>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = products.map(product => {
        const productName = product.name || "Product";
        const description = product.description || "Quality product";
        const category = product.category || "General";
        const price = Number(product.price) || 0;
        const productId = Number(product.id);
        const imageSrc = getProductImage(product);
        const stock = Number(product.quantity) || 0;

        const imageHTML = imageSrc
            ? `
                <img
                    src="${imageSrc}"
                    alt="${productName}"
                    class="product-img"
                    loading="lazy"
                    onerror="handleImageError(this)"
                >
            `
            : '<div class="image-placeholder">🛍️</div>';

        return `
            <div class="product-card">
                <div class="product-image">
                    ${imageHTML}
                </div>

                <h3>${productName}</h3>

                <p class="product-description">
                    ${description}
                </p>

                <p class="price">
                    ₹${price.toFixed(2)}
                </p>

                <p class="product-category">
                    Category: <strong>${category}</strong>
                </p>

                <p class="stock-status">
                    ${
                        stock > 0
                            ? `In Stock: ${stock}`
                            : "Out of Stock"
                    }
                </p>

                <button
                    class="cart-btn"
                    onclick="addToCart(${productId})"
                    ${stock <= 0 ? "disabled" : ""}
                >
                    ${stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
            </div>
        `;
    }).join("");
}

// ========================================
// CATEGORY FILTER
// ========================================

function filterCategory(category) {
    currentCategory = category;

    if (category === "All") {
        displayProducts(allProducts);
        return;
    }

    const filteredProducts = allProducts.filter(product =>
        (product.category || "").toLowerCase() ===
        category.toLowerCase()
    );

    displayProducts(filteredProducts);
}

// ========================================
// SEARCH PRODUCTS
// ========================================

function searchProducts() {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) return;

    const searchText = searchInput.value.trim().toLowerCase();

    let productsToSearch = allProducts;

    if (currentCategory !== "All") {
        productsToSearch = allProducts.filter(product =>
            (product.category || "").toLowerCase() ===
            currentCategory.toLowerCase()
        );
    }

    if (!searchText) {
        displayProducts(productsToSearch);
        return;
    }

    const filteredProducts = productsToSearch.filter(product =>
        (product.name || "").toLowerCase().includes(searchText) ||
        (product.category || "").toLowerCase().includes(searchText) ||
        (product.description || "").toLowerCase().includes(searchText)
    );

    displayProducts(filteredProducts);
}

// ========================================
// SEARCH WHILE TYPING
// ========================================

function enableSearchTyping() {
    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        searchInput.addEventListener("input", searchProducts);
    }
}

// ========================================
// SCROLL TO PRODUCTS
// ========================================

function scrollToProducts() {
    const section = document.getElementById("productsSection");

    if (section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// ========================================
// ADD TO CART
// ========================================

function addToCart(productId) {
    const product = allProducts.find(
        item => Number(item.id) === Number(productId)
    );

    if (!product) {
        alert("Product not found!");
        return;
    }

    const stock = Number(product.quantity) || 0;

    if (stock <= 0) {
        alert("This product is out of stock!");
        return;
    }

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingProduct = cart.find(
        item => Number(item.id) === Number(productId)
    );

    const currentQuantity = existingProduct
        ? Number(existingProduct.quantity) || 0
        : 0;

    if (currentQuantity >= stock) {
        alert("You cannot add more than the available stock!");
        return;
    }

    if (existingProduct) {
        existingProduct.quantity = currentQuantity + 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: getProductImage(product),
            quantity: 1
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    alert(product.name + " added to cart!");
}

// ========================================
// LOGIN
// ========================================

async function loginUser(event) {
    if (event) event.preventDefault();

    const emailElement = document.getElementById("loginEmail");
    const passwordElement = document.getElementById("loginPassword");

    if (!emailElement || !passwordElement) return;

    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8080/api/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body:
                    "email=" + encodeURIComponent(email) +
                    "&password=" + encodeURIComponent(password)
            }
        );

        const result = await response.json();

        if (result.success) {
            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(result.user)
            );

            alert("Login successful!");
            window.location.href = "index.html";
        } else {
            alert(result.message || "Login failed.");
        }

    } catch (error) {
        console.error("Login error:", error);
        alert("Cannot connect to Jai Mart backend!");
    }
}

// ========================================
// REGISTER
// ========================================

async function registerUser(event) {
    if (event) event.preventDefault();

    const nameElement = document.getElementById("registerName");
    const emailElement = document.getElementById("registerEmail");
    const phoneElement = document.getElementById("registerPhone");
    const passwordElement = document.getElementById("registerPassword");
    const confirmPasswordElement = document.getElementById("confirmPassword");

    if (
        !nameElement ||
        !emailElement ||
        !phoneElement ||
        !passwordElement ||
        !confirmPasswordElement
    ) {
        return;
    }

    const name = nameElement.value.trim();
    const email = emailElement.value.trim();
    const phone = phoneElement.value.trim();
    const password = passwordElement.value;
    const confirmPassword = confirmPasswordElement.value;

    if (!name || !email || !phone || !password) {
        alert("Please fill all required fields.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8080/api/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body:
                    "name=" + encodeURIComponent(name) +
                    "&email=" + encodeURIComponent(email) +
                    "&phone=" + encodeURIComponent(phone) +
                    "&password=" + encodeURIComponent(password)
            }
        );

        const result = await response.json();

        if (result.success) {
            alert("Account created successfully!");
            window.location.href = "login.html";
        } else {
            alert(result.message || "Registration failed.");
        }

    } catch (error) {
        console.error("Registration error:", error);
        alert("Cannot connect to Jai Mart backend!");
    }
}

// ========================================
// LOAD CHECKOUT TOTAL
// ========================================

function loadCheckoutTotal() {
    const totalElement = document.getElementById("checkoutTotal");

    if (!totalElement) return;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const total = cart.reduce(
        (sum, item) =>
            sum +
            (Number(item.price) || 0) *
            (Number(item.quantity) || 1),
        0
    );

    totalElement.textContent = total.toFixed(2);
}

// ========================================
// PLACE ORDER
// ========================================

async function placeOrder(event) {
    if (event) event.preventDefault();

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const nameElement = document.getElementById("orderName");
    const phoneElement = document.getElementById("orderPhone");
    const addressElement = document.getElementById("orderAddress");
    const cityElement = document.getElementById("orderCity");
    const pincodeElement = document.getElementById("orderPincode");

    if (
        !nameElement ||
        !phoneElement ||
        !addressElement ||
        !cityElement ||
        !pincodeElement
    ) {
        alert("Delivery form fields could not be found.");
        return;
    }

    const name = nameElement.value.trim();
    const phone = phoneElement.value.trim();
    const address = addressElement.value.trim();
    const city = cityElement.value.trim();
    const pincode = pincodeElement.value.trim();

    if (!name || !phone || !address || !city || !pincode) {
        alert("Please fill all delivery details.");
        return;
    }

    const total = cart.reduce(
        (sum, item) =>
            sum +
            (Number(item.price) || 0) *
            (Number(item.quantity) || 1),
        0
    );

    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!user || !user.id) {
        alert("Please login before placing an order.");
        window.location.href = "login.html";
        return;
    }

    const requestBody = {
        user_id: Number(user.id),
        total_amount: total,
        name,
        phone,
        address,
        city,
        pincode,
        items: cart.map(item =>
            `${Number(item.id)}:${Number(item.quantity) || 1}:${Number(item.price) || 0}`
        ).join(",")
    };

    try {
        const response = await fetch(
            "http://localhost:8080/api/orders",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "Order could not be placed.");
            return;
        }

        const order = {
            orderId: result.order_id,
            name,
            phone,
            address,
            city,
            pincode,
            items: cart,
            total,
            status: "Order Placed",
            date: new Date().toLocaleString()
        };

        let orders = JSON.parse(localStorage.getItem("orders")) || [];
        orders.push(order);

        localStorage.setItem("orders", JSON.stringify(orders));
        localStorage.removeItem("cart");

        alert("Order placed successfully!");
        window.location.href = "orders.html";

    } catch (error) {
        console.error("Order error:", error);
        alert("Cannot connect to Jai Mart backend or order API!");
    }
}

// ========================================
// DISPLAY ORDERS
// ========================================

function displayOrders() {
    const orderList = document.getElementById("orderList");

    if (!orderList) return;

    const orders = JSON.parse(localStorage.getItem("orders")) || [];

    if (orders.length === 0) {
        orderList.innerHTML = "<p>No orders found.</p>";
        return;
    }

    orderList.innerHTML = orders.map(order => {
        const items = order.items || [];

        const itemHTML = items.map(item => `
            <div class="order-item">
                <strong>${item.name}</strong>
                <span>
                    ₹${Number(item.price || 0).toFixed(2)}
                    × ${Number(item.quantity || 1)}
                </span>
            </div>
        `).join("");

        return `
            <div class="order-card">
                <h3>Order ID: ${order.orderId}</h3>
                <p>Date: ${order.date}</p>
                <p>
                    Status:
                    <strong class="order-status">${order.status}</strong>
                </p>
                <p>
                    Delivery: ${order.address}, ${order.city} - ${order.pincode}
                </p>
                <div>${itemHTML}</div>
                <h3>Total: ₹${Number(order.total || 0).toFixed(2)}</h3>
            </div>
        `;
    }).join("");
}

// ========================================
// UPDATE LOGIN LINK
// ========================================

function updateLoginLink() {
    const loginLink = document.getElementById("loginLink");

    if (!loginLink) return;

    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (user) {
        loginLink.textContent = "Logout";
        loginLink.href = "#";

        loginLink.onclick = function(event) {
            event.preventDefault();
            localStorage.removeItem("loggedInUser");
            window.location.href = "index.html";
        };
    } else {
        loginLink.textContent = "Login";
        loginLink.href = "login.html";
        loginLink.onclick = null;
    }
}

// ========================================
// PAGE LOAD
// ========================================

document.addEventListener("DOMContentLoaded", function() {
    loadProducts();
    loadCheckoutTotal();
    displayOrders();
    updateLoginLink();
    enableSearchTyping();
});
