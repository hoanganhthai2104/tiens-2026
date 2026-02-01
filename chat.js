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
        
        PHONG CÁCH TRẢ LỜI (MÔ PHỎNG NHÂN VIÊN TƯ VẤN THỰC TẾ):
        1.  **QUAN TRỌNG NHẤT:** VIẾT VĂN BẢN THUẦN TÚY (PLAIN TEXT).
            -   TUYỆT ĐỐI KHÔNG dùng dấu sao (**) để in đậm. (Ví dụ: Viết "Canxi Thiên Sư" thay vì "**Canxi Thiên Sư**").
            -   TUYỆT ĐỐI KHÔNG dùng biểu tượng/icon/emoji. (Trông sẽ thiếu nghiêm túc).
            -   Viết như người bình thường nhắn tin Zalo/Messenger: Dùng dấu gạch ngang (-) đầu dòng nếu cần liệt kê, còn lại viết thành đoạn văn.

        2.  **Cấu trúc câu trả lời:**
            -   Lời chào & Đồng cảm: "Chào anh/chị, em Tiens đây ạ. Em rất hiểu..."
            -   Phân tích & Giải pháp: Viết thành lời khuyên chân thành.
            -   Tư vấn Combo: Giải thích tại sao nên dùng kết hợp.
            -   Hướng dẫn dùng: Sáng/Chiều/Tối rõ ràng.

        NGUYÊN TẮC CỐT LÕI:
        -   Xưng hô: "Em" - "Anh/Chị". (Cấm gọi "Bác").
        -   Giọng văn: Tự nhiên, ân cần, chuyên nghiệp nhưng gần gũi.
        -   Tuyệt đối trung thực với dữ liệu.

        --- DỮ LIỆU SẢN PHẨM (SỰ THẬT DUY NHẤT) ---
        ${productContext}

        --- CẨM NANG BỆNH LÝ (SỰ THẬT DUY NHẤT) ---
        ${knowledgeContext}
        ---------------------------------

        CÂU HỎI CỦA KHÁCH: "${userMsg}"
        
        HÃY TRẢ LỜI NGAY (Chỉ dùng văn bản thường, KHÔNG in đậm, KHÔNG icon, viết như người thật nhắn tin):
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
