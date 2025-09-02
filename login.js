const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { getUserDataPath } = require('./electron/userDataPath');
const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');
const { Jimp } = require("jimp");
const QrCode = require('qrcode-reader');
const https = require('https');
const http = require('http');

// Cookie 文件路径
const COOKIE_PATH = getUserDataPath('wechat_cookies.json');
// 二维码图片保存路径
const QR_CODE_PATH = getUserDataPath('qrcode.png');

/**
 * 检查是否已登录微信公众平台
 * 
 * @param {Page} page - Puppeteer页面对象
 * @returns {Promise<boolean>} 是否已登录
 */
async function isLogin(page) {
  try {
    console.log('检查是否已登录微信公众平台...');
    await page.goto('https://mp.weixin.qq.com/', {waitUntil: 'networkidle2'});
    await page.waitForSelector('#js_mp_sidemenu', {timeout: 10000});
    return true;
  } catch (e) {
    console.error(`检查登录状态时出错: ${e.message}`);
    return false;
  }
}

/**
 * 通过微信接口直接获取二维码图片并保存
 * @returns {Promise<string>} 返回二维码图片保存路径
 */
async function fetchQRCodeByApi() {
  return new Promise((resolve, reject) => {
    const ts = Date.now();
    const url = `https://mp.weixin.qq.com/cgi-bin/scanloginqrcode?action=getqrcode&random=${ts}`;
    const file = fs.createWriteStream(QR_CODE_PATH);
    // 添加常见浏览器请求头
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://mp.weixin.qq.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Connection': 'keep-alive'
      }
    };
    console.log('[调试] 请求二维码接口URL:', url);
    https.get(url, options, (res) => {
      console.log('[调试] 二维码接口响应状态码:', res.statusCode);
      res.on('data', chunk => {
        // 仅用于调试输出部分内容
        console.log('[调试] 响应数据块长度:', chunk.length);
      });
      if (res.statusCode !== 200) {
        reject(new Error('二维码图片获取失败，状态码: ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('[调试] 二维码图片已保存:', QR_CODE_PATH);
          resolve(QR_CODE_PATH);
        });
      });
      file.on('error', (err) => {
        fs.unlink(QR_CODE_PATH, () => reject(err));
      });
    }).on('error', err => {
      console.error('[调试] 请求二维码接口出错:', err);
      reject(err);
    });
  });
}

/**
 * 通过微信接口直接获取二维码图片并保存（带上Puppeteer获取到的Cookie）
 * @param {Array} cookies Puppeteer获取到的cookie数组
 * @returns {Promise<string>} 返回二维码图片保存路径
 */
async function fetchQRCodeByApiWithCookie(cookies) {
  return new Promise((resolve, reject) => {
    const ts = Date.now();
    const url = `https://mp.weixin.qq.com/cgi-bin/scanloginqrcode?action=getqrcode&random=${ts}`;
    const file = fs.createWriteStream(QR_CODE_PATH);
    // 拼接cookie字符串
    let cookieStr = '';
    if (Array.isArray(cookies)) {
      cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://mp.weixin.qq.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Connection': 'keep-alive',
        'Cookie': cookieStr
      }
    };
    console.log('[调试] 请求二维码接口URL:', url);
    https.get(url, options, (res) => {
      console.log('[调试] 二维码接口响应状态码:', res.statusCode);
      let totalLength = 0;
      res.on('data', chunk => {
        totalLength += chunk.length;
        console.log('[调试] 响应数据块长度:', chunk.length);
      });
      res.on('end', () => {
        console.log('[调试] 响应总长度:', totalLength);
      });
      if (res.statusCode !== 200) {
        reject(new Error('二维码图片获取失败，状态码: ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('[调试] 二维码图片已保存:', QR_CODE_PATH);
          resolve(QR_CODE_PATH);
        });
      });
      file.on('error', (err) => {
        fs.unlink(QR_CODE_PATH, () => reject(err));
      });
    }).on('error', err => {
      console.error('[调试] 请求二维码接口出错:', err);
      reject(err);
    });
  });
}

/**
 * 登录微信公众平台
 * 
 * @returns {Promise<{browser: Browser, page: Page}>} 浏览器和页面对象
 */
async function gzhLogin() {
  let browser = null;
  try {
    browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    if (fs.existsSync(COOKIE_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
      await page.setCookie(...cookies);
      if (await isLogin(page)) {
        console.log('已通过本地 Cookie 登录');
        return {browser, page};
      } else {
        console.log('Cookie已失效，需要重新登录');
      }
    }
    await page.goto('https://mp.weixin.qq.com/', {waitUntil: 'networkidle2'});
    await page.waitForSelector('#header .login__type__container', {timeout: 10000});
    // 获取Puppeteer当前页面cookie
    const cookies = await page.cookies();
    // 通过接口获取二维码图片，带上cookie
    console.log('正在通过接口获取二维码图片...');
    await fetchQRCodeByApiWithCookie(cookies);
    // 解析二维码内容
    console.log('正在解析二维码内容...');
    const qrContent = await decodeQRCode(QR_CODE_PATH);
    if (qrContent) {
      console.log('正在生成控制台二维码...');
      displayQRCodeInTerminal(qrContent);
    } else {
      console.log('二维码内容解析失败，尝试直接打开二维码图片...');
      await displayQRCode(QR_CODE_PATH);
      console.log('已打开二维码图片，请查看并扫描登录');
    }
    console.log('请扫码登录微信公众号后台...');
    await page.waitForNavigation({timeout: 120000, waitUntil: 'networkidle2'});
    if (fs.existsSync(QR_CODE_PATH)) {
      fs.unlinkSync(QR_CODE_PATH);
    }
    const cookiesAfter = await page.cookies();
    fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookiesAfter, null, 2));
    console.log('登录成功，Cookie 已保存');
    return {browser, page};
  } catch (err) {
    console.error(`登录过程中出错: ${err.message}`);
    if (browser) await browser.close();
    throw err;
  }
}

/**
 * 显示二维码图片
 * 
 * @param {string} qrcodePath - 二维码图片路径
 * @returns {Promise<void>}
 */
async function displayQRCode(qrcodePath) {
  return new Promise((resolve, reject) => {
    // 根据操作系统选择合适的命令打开图片
    const command = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open';
    
    exec(`${command} ${qrcodePath}`, (error) => {
      if (error) {
        console.error(`打开二维码图片失败: ${error.message}`);
        reject(error);
      } else {
        console.log('已打开二维码图片，请扫码登录');
        resolve();
      }
    });
  });
}

/**
 * 在控制台显示二维码
 * 
 * @param {string} qrcodeUrl - 二维码URL或内容
 */
function displayQRCodeInTerminal(qrcodeUrl) {
  console.log('请扫描下方二维码登录微信公众号后台:');
  try {
    // 确保qrcodeUrl是有效的URL或文本
    if (qrcodeUrl && typeof qrcodeUrl === 'string') {
      // 直接使用qrcode-terminal库生成ASCII二维码
      qrcode.generate(qrcodeUrl, {small: true});
      console.log('二维码生成完成，请使用微信扫描上方二维码');
    } else {
      console.error('无效的二维码URL，无法生成二维码');
    }
  } catch (error) {
    console.error('生成二维码时出错:', error);
  }
}

/**
 * 下载远程图片到本地，支持base64和带cookie
 * @param {string} url - 图片URL
 * @param {string} dest - 保存路径
 * @param {object} [options] - 可选参数，如headers、cookies等
 * @returns {Promise<void>}
 */
async function downloadImage(url, dest, options = {}) {
  // 处理base64图片
  if (url.startsWith('data:image')) {
    const base64Data = url.split(',')[1];
    fs.writeFileSync(dest, Buffer.from(base64Data, 'base64'));
    return;
  }
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const reqOptions = new URL(url);
    // 添加请求头和cookie
    reqOptions.headers = options.headers || {};
    if (options.cookies) {
      reqOptions.headers['Cookie'] = options.cookies;
    }
    mod.get(reqOptions, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('图片下载失败，状态码: ' + res.statusCode));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', reject);
  });
}

/**
 * 解析二维码图片内容
 * @param {string} imagePath - 图片路径
 * @returns {Promise<string|null>} - 二维码内容
 */
/**
 * 解析二维码图片内容
 * @param {string} imagePath - 图片路径
 * @returns {Promise<string|null>} - 二维码内容
 */
async function decodeQRCode(imagePath) {
  try {
    var buffer = fs.readFileSync(imagePath);
    var valueTarget = null;
    await Jimp.read(buffer).then(image => {
      var qr = new QrCode();
      qr.callback = function (err, value) {
        if (err) {
          console.error('Error decoding QR code:', err);
          return null;
        }
        valueTarget = value.result;
      };
      qr.decode(image.bitmap);
    })
    return valueTarget;
  } catch (error) {
      console.error('Error processing image:', error);
      return null;
  }
  
}

/**
 * 获取登录二维码（如已登录则直接返回，无需扫码）
 * @returns {Promise<{browser: Browser, page: Page, qrCodePath?: string, loggedIn: boolean}>}
 */
async function getLoginQRCode() {
  // 检查本地cookie是否已登录
  if (fs.existsSync(COOKIE_PATH)) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    const page = await browser.newPage();
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    if (await isLogin(page)) {
      console.log('已通过本地Cookie登录，无需扫码');
      return { browser, page, loggedIn: true };
    } else {
      await browser.close();
      console.log('Cookie已失效，需要扫码登录');
    }
  }
  const qrCodePath = getUserDataPath('qrcode_wechat.png');
  try {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('https://mp.weixin.qq.com/', {waitUntil: 'networkidle2'});
    await page.waitForSelector('#header .login__type__container', {timeout: 10000});
    const cookies = await page.cookies();
    console.log('正在获取二维码图片...');
    await fetchQRCodeByApiWithCookie(cookies);
    fs.copyFileSync(QR_CODE_PATH, qrCodePath);
    return { browser, page, qrCodePath, loggedIn: false };
  } catch (err) {
    console.error(`获取登录二维码过程中出错: ${err.message}`);
    throw err;
  }
}

/**
 * 检查登录状态
 * @returns {Promise<{isLoggedIn: boolean}>} 登录状态
 */
async function checkLoginStatus() {
  try {
    if (!fs.existsSync(COOKIE_PATH)) {
      return { isLoggedIn: false };
    }
    
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    
    const loggedIn = await isLogin(page);
    await browser.close();
    
    return { isLoggedIn: loggedIn };
  } catch (err) {
    console.error(`检查登录状态时出错: ${err.message}`);
    return { isLoggedIn: false, error: err.message };
  }
}

module.exports = { getLoginQRCode, checkLoginStatus, isLogin };