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
// Feature Carousel Logic
let promoInterval = null;
let currentPromoIndex = 0;
let promoData = [];

async function loadPromotions() {
    const container = document.getElementById('promoGrid');
    if (!container) return;

    // Switch container class for styling
    container.className = 'feature-container'; // Replaces 'promo-grid'

    try {
        const res = await fetch('promotions.json');
        promoData = await res.json();

        // 1. Build Layout (Left List + Right Image Display)
        const listHTML = promoData.map((p, i) => {
            // Simple parsing to extract Time and content after <br>
            let time = '';
            let target = '';

            if (p.description.includes('Thời gian:')) {
                const parts = p.description.split(/<br>|\n/);
                time = parts.find(s => s.trim().startsWith('Thời gian:')) || '';
                // Try to find the target/audience line (usually the part after time or specific keywords)
                // If not found, take the second part as "Details"
                const rest = parts.filter(s => !s.trim().startsWith('Thời gian:')).join(' ');
                target = rest.replace(/(Ưu đãi dành riêng cho|Dành cho|Ưu đãi dành cho|Đối tượng:)/i, '<b>Đối tượng:</b> $1');
            } else {
                target = p.description;
            }

            return `
            <div class="feature-item" onclick="selectPromo(${i})" id="promo-item-${i}">
                <div class="feature-circle">${i + 1}</div>
                <div class="feature-text">
                    <h3>${p.title}</h3>
                    <p class="promo-time">${time}</p>
                    <p class="promo-target">${target}</p>
                    <!-- Mobile-only inline image -->
                    <img class="mobile-promo-img" src="${p.image}" alt="${p.title}" 
                         onerror="this.style.display='none'">
                    <div class="feature-progress" id="progress-${i}"></div>
                </div>
            </div>
            `;
        }).join('');

        const imagesHTML = promoData.map((p, i) => `
            <img src="${p.image}" 
                 id="promo-img-${i}" 
                 class="${i === 0 ? 'active' : ''}"
                 onerror="this.onerror=null; this.src='${p.image.replace('images/', '')}'"
                 alt="${p.title}">
        `).join('');

        container.innerHTML = `
            <div class="feature-list">${listHTML}</div>
            <div class="feature-display">${imagesHTML}</div>
        `;

        // 2. Start Carousel
        startPromoCarousel();

    } catch (e) {
        console.error('Promo load error', e);
        container.innerHTML = '<p>Không thể tải khuyến mãi.</p>';
    }
}

function selectPromo(index) {
    if (index === currentPromoIndex) return;

    // Reset Timer on manual interaction
    clearInterval(promoInterval);
    updatePromoUI(index);
    startPromoCarousel(); // Restart with new baseline
}

function updatePromoUI(index) {
    // 1. Update Items (Active State)
    document.querySelectorAll('.feature-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
        const circle = el.querySelector('.feature-circle');
        circle.textContent = (i <= index) ? '✓' : (i + 1);
    });

    // 2. Update Images (Active State)
    document.querySelectorAll('.feature-display img').forEach((img, i) => {
        img.classList.toggle('active', i === index);
    });

    currentPromoIndex = index;
}

function startPromoCarousel() {
    // Initial Render
    updatePromoUI(currentPromoIndex);

    // Auto Loop
    if (promoInterval) clearInterval(promoInterval);

    promoInterval = setInterval(() => {
        let nextIndex = (currentPromoIndex + 1) % promoData.length;
        updatePromoUI(nextIndex);
    }, 4000); // 4 seconds per slide
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
        const res = await fetch('/chat', {
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
