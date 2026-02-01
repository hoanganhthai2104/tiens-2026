const products = require('./products.json');
const knowledgeBase = require('./knowledge_base.js');

module.exports = async (req, res) => {
    // Enable CORS
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
        const msg = req.body.message || '';
        const lowerMsg = msg.toLowerCase();

        // Helper
        function formatPrice(price) {
            return price.toLocaleString('vi-VN') + ' đ';
        }

        // Logic copied from server.js
        let keyword = null;
        if (lowerMsg.includes('gout') || lowerMsg.includes('gút')) keyword = 'gout';
        else if (lowerMsg.includes('xương') || lowerMsg.includes('khớp') || lowerMsg.includes('đau lưng')) keyword = 'xuong_khop';
        else if (lowerMsg.includes('tiểu đường') || lowerMsg.includes('đường huyết')) keyword = 'tieu_duong';
        else if (lowerMsg.includes('tim') || lowerMsg.includes('huyết áp')) keyword = 'tim_mach';
        else if (lowerMsg.includes('dạ dày') || lowerMsg.includes('bao tử')) keyword = 'da_day';
        else if (lowerMsg.includes('ngủ') || lowerMsg.includes('mất ngủ')) keyword = 'mat_ngu';

        let answer = '';

        // 1. Check Knowledge Base
        if (keyword && knowledgeBase[keyword]) {
            const info = knowledgeBase[keyword];
            answer += `💡 **Tư vấn:** ${info.advice}\n\n`;
            answer += `💊 **Sản phẩm khuyên dùng:**\n`;

            info.products.forEach(pName => {
                const product = products.find(p => p.name.includes(pName)) || products.find(p => p.name.includes(pName.split(' ')[0]));
                if (product) {
                    answer += `- **${product.name}**: ${formatPrice(product.pricing.consumer)}\n`;
                } else {
                    answer += `- ${pName}\n`;
                }
            });
        }
        // 2. Check Price
        else if (lowerMsg.includes('giá') || lowerMsg.includes('bao nhiêu')) {
            const productMatches = products.filter(p => lowerMsg.includes(p.name.toLowerCase()) || (p.category && lowerMsg.includes(p.category.toLowerCase())));
            if (productMatches.length > 0) {
                const p = productMatches[0];
                answer = `💰 **${p.name}** có giá bán lẻ là **${formatPrice(p.pricing.consumer)}**.\n\n(Giá thành viên: ${formatPrice(p.pricing.member)})`;
            } else {
                answer = "Bạn muốn hỏi giá sản phẩm nào? (Ví dụ: 'Giá Canxi', 'Giá Trà').";
            }
        }
        // 3. Greeting
        else if (lowerMsg.includes('chào') || lowerMsg.includes('hello')) {
            answer = "Chào bạn! Tôi là trợ lý sức khỏe Tiens. Bạn cần tra cứu giá hay tư vấn bệnh lý (Xương khớp, Gout, Dạ dày...)?";
        }
        else {
            answer = "Xin lỗi, tôi chưa hiểu rõ. Bạn có thể hỏi về:\n- Bệnh lý (Gout, Tiểu đường...)\n- Giá sản phẩm\n- Khuyến mãi";
        }

        return res.status(200).json({ answer });

    } catch (error) {
        console.error("Serverless Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
