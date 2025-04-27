const { app, BrowserWindow, ipcMain, BrowserView, clipboard, dialog } = require('electron');
const path = require('path');
const { getUserDataPath } = require('./userDataPath');
const fs = require('fs');
const { getLoginQRCode} = require('../login');
const { searchGzh, getArticles, aiReadArticle, aiReadArticleStream, exportArticlePdf } = require('../wechat_spider_allpages');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const http = require('http');
const url = require('url');
const https = require('https');
dotenv.config();

let browser = null;
let page = null;
let token = null;
const dbPath = getUserDataPath('fav.db');
const cookiePath = getUserDataPath('wechat_cookies.json');
const db = new Database(dbPath);
db.prepare(`CREATE TABLE IF NOT EXISTS fav_gzh (
  fakeid TEXT PRIMARY KEY,
  nickname TEXT,
  alias TEXT,
  round_head_img TEXT
)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS fav_article (
  appmsgid TEXT PRIMARY KEY,
  title TEXT,
  author TEXT,
  digest TEXT,
  link TEXT,
  update_time TEXT,
  fakeid TEXT
)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS openai_config (
  id INTEGER PRIMARY KEY,
  base_url TEXT,
  model TEXT,
  stream INTEGER,
  api_key TEXT
)`).run();

let proxyPort = 30099;
function startProxyServer(port = 30099, maxTries = 10) {
  const server = http.createServer((req, res) => {
    const query = url.parse(req.url, true).query;
    if (req.url.startsWith('/proxy-img') && query.url) {
      const imgUrl = decodeURIComponent(query.url);
      const mod = imgUrl.startsWith('https') ? https : http;
      const options = {
        headers: {
          Referer: 'https://mp.weixin.qq.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      };
      mod.get(imgUrl, options, (imgRes) => {
        if (imgRes.statusCode !== 200) {
          res.writeHead(imgRes.statusCode);
          res.end('proxy error');
          return;
        }
        res.writeHead(200, { 'Content-Type': imgRes.headers['content-type'] });
        imgRes.pipe(res);
      }).on('error', (err) => {
        console.error('[图片代理] 代理出错：', err);
        res.writeHead(500);
        res.end('proxy error');
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxTries > 0) {
      console.warn(`端口 ${port} 被占用，尝试下一个端口...`);
      startProxyServer(port + 1, maxTries - 1);
    } else {
      console.error('图片代理服务启动失败:', err);
    }
  });
  server.listen(port, () => {
    proxyPort = port;
    console.log(`图片代理服务已启动，端口: ${port}`);
  });
}
startProxyServer();

ipcMain.handle('get-proxy-port', () => proxyPort);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'static', 'icon.png')
  });
  win.maximize();
  if (process.env.VITE_DEV_SERVER === 'true') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  }

  // macOS 下点击关闭按钮时只隐藏窗口
  win.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  // Dock 图标被点击时重新显示窗口
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      win.show();
    }
  });

  return win;
}

app.setName('恐龙公众号爬虫');
app.setAboutPanelOptions({
  applicationName: '恐龙公众号爬虫',
  applicationVersion: '1.0.0',
  copyright: 'Copyright © 2024 Magnus',
  iconPath: path.join(__dirname, 'static', 'icon.png')
});

app.whenReady().then(() => {
  // 设置macOS Dock图标
  if (process.platform === 'darwin') {
    const { nativeImage } = require('electron');
    const iconPath = path.join(__dirname, 'static', 'icon.png');
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }
  createWindow();
});

app.on('window-all-closed', function () {
  if (browser) browser.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => app.isQuiting = true);

// 1. 获取二维码图片
ipcMain.handle('get-qrcode', async () => {
  try {
    const result = await getLoginQRCode();
    browser = result.browser;
    page = result.page;
    if (result.loggedIn) {
      // 已登录，无需二维码
      return { loggedIn: true };
    }
    // 读取二维码图片为base64
    const imgBuffer = fs.readFileSync(result.qrCodePath);
    const base64 = 'data:image/png;base64,' + imgBuffer.toString('base64');
    return { qrcode: base64, loggedIn: false };
  } catch (e) {
    return { error: e.message };
  }
});

// 2. 检查扫码登录状态
ipcMain.handle('check-login', async () => {
  if (!page) return { status: 'not-initialized' };
  try {
    await page.waitForSelector('#js_mp_sidemenu', { timeout: 500 });
    // 获取token
    const url = page.url();
    const tokenMatch = url.match(/token=(\d+)/);
    token = tokenMatch ? tokenMatch[1] : null;

    // 新增：保存cookie到文件
    const cookies = await page.cookies();
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    
    return { status: 'success' };
  } catch {
    return { status: 'waiting' };
  }
});

// 3. 搜索公众号
ipcMain.handle('search-gzh', async (event, keyword) => {
  if (!page) return { error: '未初始化登录页面' };
  try {
    console.log('search-gzh 当前page.url:', page.url());
    const list = await searchGzh(page, keyword);
    return { list };
  } catch (e) {
    console.error('search-gzh error:', e);
    return { error: e.message || String(e) };
  }
});

// 4. 获取文章分页
ipcMain.handle('get-articles', async (event, { fakeid, pageIndex, pageSize }) => {
  if (!page) {
    console.error('get-articles: page未初始化');
    return { articles: [], totalCount: 0, error: '未初始化登录' };
  }
  try {
    // 每次动态获取token
    const url = page.url();
    const tokenMatch = url.match(/token=(\d+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    if (!token) {
      console.error('get-articles: token未获取到，url=', url);
      return { articles: [], totalCount: 0, error: 'token未获取到' };
    }
    console.log('get-articles: fakeid=', fakeid, 'pageIndex=', pageIndex, 'pageSize=', pageSize, 'token=', token);
    const begin = pageIndex * pageSize;
    const result = await getArticles(page, fakeid, begin, pageSize, '', token);
    if (!result.articles || !result.articles.length) {
      console.error('get-articles: 未获取到文章，result=', result);
    }
    return result;
  } catch (e) {
    console.error('get-articles error:', e);
    return { articles: [], totalCount: 0, error: e.message || String(e) };
  }
});

// 收藏/取消收藏公众号
ipcMain.handle('toggle-fav-gzh', (event, gzh) => {
  const exists = db.prepare('SELECT 1 FROM fav_gzh WHERE fakeid=?').get(gzh.fakeid);
  if (exists) {
    db.prepare('DELETE FROM fav_gzh WHERE fakeid=?').run(gzh.fakeid);
    return { fav: false };
  } else {
    db.prepare('INSERT INTO fav_gzh (fakeid, nickname, alias, round_head_img) VALUES (?, ?, ?, ?)').run(
      gzh.fakeid, gzh.nickname, gzh.alias, gzh.round_head_img
    );
    return { fav: true };
  }
});
ipcMain.handle('is-fav-gzh', (event, fakeid) => {
  const exists = db.prepare('SELECT 1 FROM fav_gzh WHERE fakeid=?').get(fakeid);
  return !!exists;
});
ipcMain.handle('get-fav-gzh-list', () => {
  return db.prepare('SELECT * FROM fav_gzh').all();
});

// 收藏/取消收藏文章
ipcMain.handle('toggle-fav-article', (event, article) => {
  const exists = db.prepare('SELECT 1 FROM fav_article WHERE appmsgid=?').get(article.appmsgid);
  if (exists) {
    db.prepare('DELETE FROM fav_article WHERE appmsgid=?').run(article.appmsgid);
    return { fav: false };
  } else {
    db.prepare('INSERT INTO fav_article (appmsgid, title, author, digest, link, update_time, fakeid) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      article.appmsgid, article.title, article.author, article.digest, article.link, article.update_time, article.fakeid
    );
    return { fav: true };
  }
});
ipcMain.handle('is-fav-article', (event, appmsgid) => {
  const exists = db.prepare('SELECT 1 FROM fav_article WHERE appmsgid=?').get(appmsgid);
  return !!exists;
});
ipcMain.handle('get-fav-article-list', () => {
  return db.prepare('SELECT * FROM fav_article').all();
});

ipcMain.handle('open-article', (event, { link, title }) => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f7f7f7',
      symbolColor: '#222',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'article-preload.js'),
      contextIsolation: true,
      webviewTag: true
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'article-head.html'), { query: { link, title } });
  win.currentArticleLink = link;
  win.currentArticleTitle = title;
  win.setTitle(title || '原文查看');
});

ipcMain.handle('copy-article-link', (event, link) => {
  if (link) {
    require('electron').clipboard.writeText(link);
    return true;
  }
  // 兼容旧逻辑
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win.currentArticleLink) {
    require('electron').clipboard.writeText(win.currentArticleLink);
    return true;
  }
  return false;
});

ipcMain.handle('ai-read-article', async (event, article) => {
  if (!page) return { error: '未初始化puppeteer页面' };
  const config = db.prepare('SELECT * FROM openai_config WHERE id=1').get() || {};
  return await aiReadArticle(page, article, {
    baseUrl: config.base_url,
    model: config.model,
    stream: !!config.stream,
    apiKey: config.api_key
  });
});

ipcMain.on('ai-read-article-stream', async (event, article) => {
  if (!page) {
    event.sender.send('ai-read-article-stream', { error: '未初始化puppeteer页面', done: true });
    return;
  }
  const config = db.prepare('SELECT * FROM openai_config WHERE id=1').get() || {};
  let finished = false;
  try {
    await aiReadArticleStream(page, article, (delta) => {
      if (delta === null) {
        finished = true;
        event.sender.send('ai-read-article-stream', { done: true });
      } else {
        event.sender.send('ai-read-article-stream', { content: delta });
      }
    }, {
      baseUrl: config.base_url,
      model: config.model,
      stream: !!config.stream,
      apiKey: config.api_key
    });
  } catch (e) {
    if (!finished) {
      event.sender.send('ai-read-article-stream', { error: e.message || String(e), done: true });
    }
  }
});

ipcMain.handle('export-article-pdf', async (event, url) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const title = win.currentArticleTitle || 'article';
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: '保存PDF',
    defaultPath: `${title}.pdf`,
    filters: [{ name: 'PDF文件', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) {
    return { success: false, error: '用户取消保存' };
  }
  return await exportArticlePdf(url, filePath);
});

ipcMain.handle('get-openai-config', () => {
  const row = db.prepare('SELECT * FROM openai_config WHERE id=1').get();
  if (!row) {
    return { base_url: '', model: '', stream: 0, api_key: '' };
  }
  return {
    base_url: row.base_url || '',
    model: row.model || '',
    stream: !!row.stream,
    api_key: row.api_key || ''
  };
});

ipcMain.handle('set-openai-config', (event, config) => {
  db.prepare(`INSERT INTO openai_config (id, base_url, model, stream, api_key) VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, model=excluded.model, stream=excluded.stream, api_key=excluded.api_key`)
    .run(config.base_url, config.model, config.stream ? 1 : 0, config.api_key);
  return true;
});
