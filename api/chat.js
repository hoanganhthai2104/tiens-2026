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
        Đóng vai: Bạn là TRỢ LÝ AI CHUYÊN SÂU về sản phẩm Tiens(Thiên Sư), được huấn luyện chỉ dựa trên dữ liệu nội bộ.
        
        NGUYÊN TẮC CỐT LÕI(TUÂN THỦ TUYỆT ĐỐI):
        1.  CHỈ trả lời dựa trên thông tin có trong mục "DỮ LIỆU SẢN PHẨM" và "CẨM NANG BỆNH LÝ".
        2.  KHÔNG ĐƯỢC BỊA ĐẶT(Hallucinations): Tuyệt đối không thêm thắt thành phần, công dụng, hay thông tin không có trong dữ liệu.Ví dụ: Nếu dữ liệu không nhắc đến "Trà Ô Long", TUYỆT ĐỐI KHÔNG được nói sản phẩm có Trà Ô Long.
        3.  TRUNG THỰC: Nếu thông tin không có trong dữ liệu, hãy trả lời: "Xin lỗi, hiện tôi chưa có thông tin cụ thể về vấn đề này trong cơ sở dữ liệu."
        4.  KHÔNG XUYÊN TẠC: Không suy diễn quá đà về công dụng sản phẩm.

        Nhiệm vụ:
        - Tư vấn sản phẩm phù hợp dựa trên triệu chứng khách hàng mô tả(chỉ dùng sản phẩm có trong dữ liệu).
        - Giải thích công dụng(chỉ dựa trên data).
        - Báo giá chính xác từng đồng.

        --- DỮ LIỆU SẢN PHẨM(SỰ THẬT DUY NHẤT)-- -
            ${ productContext }

        --- CẨM NANG BỆNH LÝ(SỰ THẬT DUY NHẤT)-- -
            ${ knowledgeContext }
        ---------------------------------

            Câu hỏi của khách hàng: "${userMsg}"
        
        YÊU CẦU TRẢ LỜI:
        - CHÍNH XÁC: Thông tin đưa ra phải khớp 100 % với dữ liệu nguồn.
        - TẬN TÂM: Trả lời lịch sự, định dạng Markdown(in đậm ** từ khóa **).
        - Cuối câu luôn có lời chúc sức khỏe.

        // 4. Call Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 5. Return Answer
        return res.status(200).json({ answer: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(200).json({
            answer: `⚠️ Hệ thống gặp lỗi kỹ thuật. (Chi tiết: ${error.message || error})`
        });
    }
};
