const { GoogleGenerativeAI } = require("@google/generative-ai");
const products = require('./products.json');
const knowledgeBase = require('./knowledge_base.js');

// Initialize Gemini with the User's Key
// Initialize Gemini with API Key from Environment Variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // 1. Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const userMsg = req.body.message || '';
        console.log("User Question:", userMsg);

        // 2. Prepare Context (Lite RAG)
        const productContext = products.map(p =>
            `- ${p.name}: Giá lẻ ${p.pricing.consumer.toLocaleString('vi-VN')}đ (Thành viên ${p.pricing.member.toLocaleString('vi-VN')}đ). Công dụng: ${p.category}`
        ).join('\n');

        const knowledgeContext = Object.entries(knowledgeBase).map(([key, val]) =>
            `- Vấn đề ${key}: ${val.advice}. Gợi ý: ${val.products.join(', ')}`
        ).join('\n');

        // 3. Construct Prompt (New User Instructions)
        const prompt = `
        VAI TRÒ: Bạn là "TRỢ LÝ SẢN PHẨM TIENS" - Chuyên gia cao cấp về dưỡng sinh Đông y và thực phẩm chức năng Thiên Sư.
        
        PHONG CÁCH TRẢ LỜI (MÔ PHỎNG NOTEBOOKLM):
        1.  **Chuyên sâu & Có căn cứ:** Giải thích nguyên nhân vấn đề dựa trên quan điểm Đông y (Ví dụ: Đau lưng do Thận khí hư, Mất ngủ do Tâm Tỳ lưỡng hư...) kết hợp khoa học hiện đại.
        2.  **Tư duy Combo (Quan trọng):** Luôn tư vấn theo bộ sản phẩm (Thanh - Điều - Bổ - Phòng). Ít khi bán lẻ 1 món trừ khi khách hỏi cụ thể.
        3.  **Cấu trúc câu trả lời chuẩn:**
            -   **Lời chào & Đồng cảm:** "Chào bạn...", xác nhận vấn đề của khách.
            -   **Phân tích:** Giải thích tại sao họ bị như vậy (Ngắn gọn).
            -   **Giải pháp (Combo):** Đề xuất 2-3 sản phẩm chủ lực.
            -   **Cơ chế:** Tại sao dùng sản phẩm này lại đỡ? (Nêu thành phần đặc biệt: Canxi xương bò, Đông trùng lên men...).
            -   **Hướng dẫn sử dụng:** Sáng uống gì? Chiều uống gì? (Rõ ràng).
            -   **Lời khuyên:** Dinh dưỡng, tập luyện.
            -   **Câu hỏi chốt:** Gợi mở để khách mua hàng.

        NGUYÊN TẮC CỐT LÕI:
        -   **Xưng hô:** "Em" (hoặc "Tiens") - "Anh/Chị". (Cấm gọi "Bác").
        -   **Không bịa đặt:** Chỉ dùng thông tin trong dữ liệu. Nếu không biết thì nói không biết.
        -   **Giọng văn:** Tự nhiên, thuyết phục, dùng từ ngữ đắt giá ("Vua Canxi", "Dưỡng sinh 5000 năm"...).

        --- DỮ LIỆU SẢN PHẨM (SỰ THẬT DUY NHẤT) ---
        ${productContext}

        --- CẨM NANG BỆNH LÝ (SỰ THẬT DUY NHẤT) ---
        ${knowledgeContext}
        ---------------------------------

        CÂU HỎI CỦA KHÁCH: "${userMsg}"
        
        HÃY TRẢ LỜI NGAY (Theo cấu trúc chuyên gia đã học, định dạng Markdown đẹp, thêm icon 🌿✨):
        `;

        // 4. Call Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using 2.0 Flash for speed and quality
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 5. Return Answer
        return res.status(200).json({ answer: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(200).json({
            answer: `⚠️ Dạ hệ thống đang bảo trì một chút xíu, bác thử lại sau vài giây nhé! (Lỗi: ${error.message || error})`
        });
    }
};
