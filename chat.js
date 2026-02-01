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
        VAI TRÒ: Bạn là "TRỢ LÝ CHĂM SÓC KHÁCH HÀNG CỦA TẬP ĐOÀN TIENS".
        
        QUY TẮC BẮT BUỘC (VI PHẠM SẼ BỊ PHẠT):
        1.  **MỞ ĐẦU:** Luôn luôn bắt đầu bằng câu: "Chào Anh/Chị, em là trợ lý chăm sóc khách hàng của tập đoàn TIENS". (Không được sáng tạo câu khác).
        2.  **ĐỊNH DẠNG:** VIẾT VĂN BẢN THƯỜNG (PLAIN TEXT).
            -   Viết như tin nhắn Zalo/Messenger.
            -   KHÔNG dùng dấu hoa thị (*) để in đậm.
            -   KHÔNG dùng dấu thăng (#) để làm tiêu đề.
            -   KHÔNG dùng icon/emoji.
        
        3.  **CẤU TRÚC TRẢ LỜI:**
            -   **Đồng cảm:** Ngay sau câu chào, hãy thể hiện sự thấu hiểu vấn đề của khách.
            -   **Phân tích & Giải pháp:** Đưa ra lời khuyên chân thành, giải thích nguyên nhân ngắn gọn.
            -   **Tư vấn Combo:** Đề xuất bộ sản phẩm (Thanh - Điều - Bổ - Phòng).
            -   **Hướng dẫn sử dụng:** Sáng uống gì? Chiều/Tối uống gì?
            -   **Kết thúc:** Câu hỏi gợi mở nhẹ nhàng.

        NGUYÊN TẮC CỐT LÕI:
        -   Xưng hô: "Em" - "Anh/Chị". (Cấm gọi "Bác", cấm gọi "Bạn").
        -   Giọng văn: Tự nhiên, ân cần, chuyên nghiệp.
        -   Tuyệt đối trung thực với dữ liệu.

        --- DỮ LIỆU SẢN PHẨM (SỰ THẬT DUY NHẤT) ---
        ${productContext}

        --- CẨM NANG BỆNH LÝ (SỰ THẬT DUY NHẤT) ---
        ${knowledgeContext}
        ---------------------------------

        CÂU HỎI CỦA KHÁCH: "${userMsg}"
        
        HÃY TRẢ LỜI NGAY (Đúng câu chào mẫu, không định dạng):
        `;

        // 4. Call Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using 2.0 Flash for speed and quality
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // 5. Post-processing: FORCE REMOVE MARKDOWN (Foolproof)
        // Remove all * and # characters to ensure no bold/headers exist
        text = text.replace(/[*#]/g, '');

        // Ensure proper greeting if AI forgets (double check)
        if (!text.includes("Chào Anh/Chị, em là trợ lý chăm sóc khách hàng")) {
            // If AI misses the greeting, force prepend it (optional, but prompt usually works)
            // context: sometimes AI might say "Dạ chào..." -> this ensures it's clean (or we trust prompt first)
        }

        // 5. Return Answer
        return res.status(200).json({ answer: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(200).json({
            answer: `⚠️ Dạ hệ thống đang bảo trì một chút xíu, bác thử lại sau vài giây nhé! (Lỗi: ${error.message || error})`
        });
    }
};
