const puppeteer = require('puppeteer');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function scrollToLoadImages(page) {
  console.log('  模拟向下滚动以加载图片...');
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    const scrollStep = 500;
    for (let position = 0; position < scrollHeight; position += scrollStep) {
      window.scrollTo(0, position);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);
  });
}

async function processPageElements(page) {
  console.log('  处理页面元素...');
  await page.evaluate(() => {
    const footers = document.querySelectorAll('.rich_media_area_primary_inner');
    footers.forEach(footer => {
      if (footer.style) footer.style.marginBottom = '0';
    });
    const wxFooter = document.querySelector('#js_pc_qr_code');
    if (wxFooter) wxFooter.remove();
    const content = document.querySelector('#js_content');
    if (content) content.style.margin = '0';
  });
}

async function exportArticlePdf(url, savePath) {
  try {
    if (!url) return { success: false, error: '无效的URL' };
    const browser = await puppeteer.launch({ 
      headless: true
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    await page.waitForSelector('#js_content');
    await scrollToLoadImages(page);
    await processPageElements(page);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      displayHeaderFooter: false
    });
    await browser.close();
    let filePath = savePath;
    if (!filePath) {
      const desktopDir = path.join(os.homedir(), 'Desktop');
      const fileName = 'article-' + Date.now() + '.pdf';
      filePath = path.join(desktopDir, fileName);
    }
    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

module.exports = { exportArticlePdf }; 