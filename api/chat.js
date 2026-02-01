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

        // 3. Construct Prompt
        const prompt = `
        Bạn là "Trợ lý sức khỏe Tiens" chuyên nghiệp, thân thiện và nhiệt tình.
        Nhiệm vụ: Tư vấn sản phẩm Thiên Sư (Tiens) cho khách hàng dựa trên dữ liệu được cung cấp dưới đây.

        KHÔNG ĐƯỢC BỊA ĐẶT thông tin. Nếu không có trong dữ liệu, hãy nói khéo là chưa có thông tin.
        Luôn ưu tiên giới thiệu sản phẩm phù hợp và báo giá chính xác.

        --- DỮ LIỆU SẢN PHẨM HỆ THỐNG ---
        ${productContext}

        --- KIẾN THỨC BỆNH LÝ CƠ BẢN ---
        ${knowledgeContext}
        ---------------------------------

        Câu hỏi của khách hàng: "${userMsg}"
        
        Trả lời (bằng tiếng Việt, ngắn gọn, dùng emoji, định dạng Markdown):
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
