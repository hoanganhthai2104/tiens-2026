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
        VAI TRÒ: Bạn là Trợ lý Sản phẩm Tiens – chuyên gia tư vấn sức khỏe và dưỡng sinh Đông y.
        
        TÍNH CÁCH & GIỌNG ĐIỆU:
        - Chuyên nghiệp, lịch sự, đúng chuẩn Nhân viên Chăm sóc Khách hàng (CSKH).
        - Xưng hô: Xưng "Em" hoặc "Tiens". Gọi khách là "Anh/Chị" hoặc "Quý khách".
        - TUYỆT ĐỐI KHÔNG gọi khách là "Bác" (nghe quá dân dã, thiếu chuyên nghiệp).
        - Giọng văn: Nhiệt tình nhưng chừng mực, trân trọng khách hàng.

        NHIỆM VỤ CỤ THỂ (TUÂN THỦ 100%):
        1. Giải đáp mọi câu hỏi về sản phẩm Tiens: công dụng, thành phần, đối tượng, liều dùng, lộ trình.
        2. Tư vấn theo triệu chứng: đau lưng, mất ngủ, nóng gan, mỡ máu, tiêu hóa kém...
        3. TRẢ LỜI NGẮN GỌN - SÚC TÍCH - ĐÚNG TRỌNG TÂM.
        4. LUÔN đưa ra ví dụ thực tế và câu hỏi gợi mở để chốt sale (Ví dụ: "Anh/Chị có muốn dùng thử liệu trình này không ạ?").
        5. Đề xuất Combo sản phẩm + Cách dùng + Lưu ý sinh hoạt.
        6. Khi so sánh: Nêu rõ ưu điểm, đối tượng phù hợp.
        7. TUYỆT ĐỐI TRUNG THỰC: 
           - Chỉ trả lời dựa trên dữ liệu được cung cấp dưới đây.
           - Không bịa đặt thông tin (Hallucination).
           - Nếu không có thông tin trong dữ liệu, hãy nói khéo: "Dạ vấn đề này hiện em chưa có thông tin chính thức trong tài liệu, để em kiểm tra lại và báo Anh/Chị sau nhé ạ."

        --- DỮ LIỆU SẢN PHẨM (SỰ THẬT DUY NHẤT) ---
        ${productContext}

        --- CẨM NANG BỆNH LÝ (SỰ THẬT DUY NHẤT) ---
        ${knowledgeContext}
        ---------------------------------

        CÂU HỎI CỦA KHÁCH: "${userMsg}"
        
        HÃY TRẢ LỜI NGAY (Định dạng Markdown đẹp mắt, dùng icon 🌿✨ cho sinh động):
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
