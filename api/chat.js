const { GoogleGenerativeAI } = require("@google/generative-ai");
const products = require('./products.json');
const knowledgeBase = require('./knowledge_base.js');

// Initialize Gemini with the User's Key
const genAI = new GoogleGenerativeAI("AIzaSyCpc_z97TABlckVwWJhV_3QRMwABBvF0Ps");

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
        // We convert the JSON data to a string to give Gemini the "Knowledge"
        // To save tokens, we map only essential fields
        const productContext = products.map(p =>
            `- ${p.name}: Giá lẻ ${p.pricing.consumer.toLocaleString('vi-VN')}đ (Thành viên ${p.pricing.member.toLocaleString('vi-VN')}đ). Công dụng: ${p.category}`
        ).join('\n');

        const knowledgeContext = Object.entries(knowledgeBase).map(([key, val]) =>
            `- Vấn đề ${key}: ${val.advice}. Gợi ý: ${val.products.join(', ')}`
        ).join('\n');

        // 3. Construct Prompt (Enhanced for "NotebookLM-like" Quality)
        const prompt = `
        Đóng vai: Bạn là CHUYÊN GIA TƯ VẤN SỨC KHỎE CẤP CAO của Tập đoàn Tiens (Thiên Sư).
        Phong cách: Chuyên nghiệp, tận tâm, giải thích CẶN KẼ, CHI TIẾT như bác sĩ tư vấn cho bệnh nhân.
        
        Nhiệm vụ:
        1.  Phân tích vấn đề sức khỏe của khách hàng (nguyên nhân, biểu hiện).
        2.  Đưa ra giải pháp dựa trên sản phẩm Tiens.
        3.  Giải thích tại sao sản phẩm đó lại tốt (cơ chế tác dụng).
        4.  Báo giá rõ ràng và gợi ý mua theo Combo để tiết kiệm.

        --- DỮ LIỆU SẢN PHẨM (KHO TÀNG KIẾN THỨC) ---
        ${productContext}

        --- CẨM NANG BỆNH LÝ ---
        ${knowledgeContext}
        ---------------------------------

        Câu hỏi của khách hàng: "${userMsg}"
        
        YÊU CẦU TRẢ LỜI:
        - KHÔNG trả lời cộc lốc. Hãy trả lời dài, có tâm, đầy đủ ý.
        - Dùng định dạng Markdown (in đậm **từ khóa**, gạch đầu dòng) cho dễ đọc.
        - Cuối câu luôn có lời chúc sức khỏe và khuyến khích đặt hàng.
        `;

        // 4. Call Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 5. Return Answer
        return res.status(200).json({ answer: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(200).json({
            answer: "⚠️ Hệ thống đang quá tải một chút. Bạn vui lòng hỏi lại câu ngắn hơn nhé! (Error: API Busy)"
        });
    }
};
