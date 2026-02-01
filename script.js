// Main JS - Samsung Redesign

let allProducts = [];

// Initialize
window.onload = function () {
    loadPromotions();
    loadProducts();

    // Auto-open chat after 2 seconds
    setTimeout(() => {
        openChat();
        addMessage('Chào bạn! 👋 Tôi có thể giúp bạn tra cứu giá hoặc khuyến mãi hôm nay không?', 'ai');
    }, 2000);
};

// -- Promotions --
async function loadPromotions() {
    const grid = document.getElementById('promoGrid');
    if (!grid) return;

    try {
        const res = await fetch('promotions.json');
        const data = await res.json();

        grid.innerHTML = data.map(promo => `
            <div class="promo-card">
                <img src="${promo.image}" alt="${promo.title}">
                <div class="promo-info">
                    <h3>${promo.title}</h3>
                    <p>${promo.description}</p>
                    <a href="${promo.link}" class="btn-link">Xem chi tiết</a>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Promo load error', e);
    }
}

// -- Products --
async function loadProducts() {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    try {
        const res = await fetch('products.json');
        allProducts = await res.json();
        renderProducts(allProducts);
    } catch (e) {
        console.error('Product load error', e);
        tbody.innerHTML = '<tr><td colspan="15">Lỗi tải dữ liệu</td></tr>';
    }
}


function renderProducts(list) {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.map(p => `
        <tr>
            <td data-label="#">${p.stt}</td>
            <td data-label="Sản Phẩm" style="font-weight:600;">${p.name}</td>
            <td data-label="Xuất Xứ">${p.origin}</td>
            <td data-label="Loại">${p.category}</td>
            <td data-label="Quy Cách">${p.packaging}</td>
            <td data-label="Giá Lẻ">${fmt(p.pricing.consumer)}</td>
            <td data-label="Thẻ VIP">${fmt(p.pricing.loyal_customer)}</td>
            <td data-label="NPP Mới">${fmt(p.pricing.member)}</td>
            <td data-label="Thẻ TV">${fmt(p.pricing.core_member)}</td>
            <td data-label="Cốt Cán">${fmt(p.pricing.manager)}</td>
            <td data-label="Giám Đốc">${fmt(p.pricing.director)}</td>
            <td data-label="Lãnh Đạo" class="price-highlight">${fmt(p.pricing.senior_director)}</td>
            <td data-label="PV">${p.pv}</td>
            <td data-label="BV">${p.bv}</td>
        </tr>
    `).join('');
}

function fmt(n) {
    return n.toLocaleString('vi-VN');
}

function filterProducts() {
    // Fix: Look for the correct input ID used in products.html
    const input = document.getElementById('productSearch') || document.getElementById('globalSearch');
    if (!input) return;

    const term = input.value.toLowerCase();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.stt.toString().includes(term)
    );
    renderProducts(filtered);
}

// -- Chat --
function toggleChat() {
    const overlay = document.getElementById('chatOverlay');
    overlay.classList.toggle('active');
}

function openChat() {
    document.getElementById('chatOverlay').classList.add('active');
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

function addMessage(text, sender) {
    const box = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerText = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    // Simulate thinking
    const loading = document.createElement('div');
    loading.className = 'message ai';
    loading.id = 'loading';
    loading.innerHTML = '<em>...</em>';
    document.getElementById('chatMessages').appendChild(loading);

    try {
        console.log("Sending request to server...");
        // Use relative path so it works on Cloudflare tunnel too
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        console.log("Received response:", data);
        document.getElementById('loading').remove();

        // CUSTOMER SUPPORT BOT V5.0
        addMessage(data.answer || 'Lỗi server', 'ai');
    } catch (e) {
        console.error("Fetch error:", e);
        document.getElementById('loading').remove();
        addMessage('⚠️ Lỗi kết nối Server. Vui lòng chạy "node server.js".', 'ai');
    }
}
