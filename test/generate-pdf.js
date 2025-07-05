const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // 读取 HTML 文件
    const htmlPath = path.join(__dirname, 'test-document.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 设置页面内容
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // 生成 PDF
    const pdfPath = path.join(__dirname, '个人智能助手设计.pdf');
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
        }
    });
    
    await browser.close();
    
    console.log(`PDF 已生成: ${pdfPath}`);
}

generatePDF().catch(console.error);
