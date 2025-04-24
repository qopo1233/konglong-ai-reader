// --- 真实数据与流程 ---

const qrcodeImg = document.getElementById('qrcode-img');
const loginStatus = document.getElementById('login-status');
const loginSection = document.getElementById('login-section');
const searchSection = document.getElementById('search-section');
const gzhSearchInput = document.getElementById('gzh-search-input');
const gzhSearchBtn = document.getElementById('gzh-search-btn');
const gzhListDiv = document.getElementById('gzh-list');
const articleSection = document.getElementById('article-section');
const articleTableBody = document.querySelector('#article-table tbody');
const paginationDiv = document.getElementById('pagination');
const exportBtn = document.getElementById('export-btn');

let selectedGzh = null;
let currentPage = 0;
let pageSize = 5;
let totalArticles = 0;
let currentArticles = [];

function formatDate(dateStr) {
  // 支持时间戳或yyyy-MM-dd等格式
  let d = dateStr;
  if (typeof d === 'number' || /^\d+$/.test(d)) {
    d = new Date(Number(d) * 1000);
  } else {
    d = new Date(d);
  }
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

// 1. 登录流程
async function startLogin() {
  loginStatus.textContent = '正在检测登录状态...';
  qrcodeImg.src = '';
  // 加载动画（可选：你可以用更复杂的动画，这里用简单文本）
  loginStatus.style.color = '#888';
  const result = await window.electronAPI.invoke('get-qrcode');
  loginStatus.style.color = '';
  if (result.error) {
    loginStatus.textContent = '二维码获取失败: ' + result.error;
    return;
  }
  if (result.loggedIn) {
    loginStatus.textContent = '已登录，无需扫码';
    setTimeout(() => {
      loginSection.style.display = 'none';
      searchSection.style.display = '';
    }, 800);
    return;
  }
  qrcodeImg.src = result.qrcode;
  loginStatus.textContent = '请扫码登录微信公众号后台';
  // 轮询登录状态
  let timer = setInterval(async () => {
    loginStatus.textContent = '正在检测扫码结果...';
    const status = await window.electronAPI.invoke('check-login');
    if (status.status === 'success') {
      clearInterval(timer);
      loginStatus.textContent = '登录成功！';
      setTimeout(() => {
        loginSection.style.display = 'none';
        searchSection.style.display = '';
      }, 800);
    }
  }, 1500);
}

// 2. 公众号搜索
async function searchGzh() {
  const keyword = gzhSearchInput.value.trim();
  if (!keyword) return;
  gzhListDiv.innerHTML = '搜索中...';
  const result = await window.electronAPI.invoke('search-gzh', keyword);
  if (result.error) {
    gzhListDiv.innerHTML = '查询出错：' + result.error;
    return;
  }
  const list = result.list;
  if (!list || !list.length) {
    gzhListDiv.innerHTML = '未找到公众号';
    return;
  }
  gzhListDiv.innerHTML = list.map((gzh, idx) =>
    `<div class="gzh-item" data-idx="${idx}">${gzh.nickname} <span style="color:#888">(${gzh.alias})</span></div>`
  ).join('');
  Array.from(document.getElementsByClassName('gzh-item')).forEach(item => {
    item.onclick = () => {
      Array.from(document.getElementsByClassName('gzh-item')).forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      selectedGzh = list[parseInt(item.dataset.idx)];
      currentPage = 0;
      showArticles();
    };
  });
}

gzhSearchBtn.onclick = searchGzh;
gzhSearchInput.onkeydown = e => { if (e.key === 'Enter') searchGzh(); };

// 3. 文章分页与展示
async function showArticles() {
  if (!selectedGzh) return;
  articleSection.style.display = '';
  const result = await window.electronAPI.invoke('get-articles', {
    fakeid: selectedGzh.fakeid,
    pageIndex: currentPage,
    pageSize
  });
  if (result.error) {
    articleTableBody.innerHTML = `<tr><td colspan='4' style='color:red'>获取文章出错：${result.error}</td></tr>`;
    paginationDiv.innerHTML = '';
    return;
  }
  const { articles, totalCount } = result;
  currentArticles = articles;
  totalArticles = totalCount;
  articleTableBody.innerHTML = articles.map(a =>
    `<tr><td>${a.title}</td><td>${a.author}</td><td>${a.digest}</td><td>${formatDate(a.update_time)}</td></tr>`
  ).join('');
  // 分页
  const totalPages = Math.ceil(totalCount / pageSize);
  let pagBtns = '';
  if (totalPages > 1) {
    const maxShow = 2;
    if (currentPage > 0) {
      pagBtns += `<button data-page="${currentPage - 1}">上一页</button>`;
    }
    for (let i = 0; i < totalPages; i++) {
      if (
        i < maxShow ||
        i >= totalPages - maxShow ||
        Math.abs(i - currentPage) <= 1
      ) {
        pagBtns += `<button ${i === currentPage ? 'disabled' : ''} data-page="${i}">${i + 1}</button>`;
      } else if (
        (i === maxShow && currentPage > maxShow + 1) ||
        (i === totalPages - maxShow && currentPage < totalPages - maxShow - 1)
      ) {
        pagBtns += '<span style="margin:0 4px">...</span>';
      }
    }
    if (currentPage < totalPages - 1) {
      pagBtns += `<button data-page="${currentPage + 1}">下一页</button>`;
    }
  }
  paginationDiv.innerHTML = pagBtns;
  Array.from(paginationDiv.querySelectorAll('button')).forEach(btn => {
    btn.onclick = () => {
      currentPage = parseInt(btn.dataset.page);
      showArticles();
    };
  });
}

// 4. 导出功能
exportBtn.onclick = () => {
  if (!currentArticles.length) return;
  const rows = currentArticles.map(a => `${a.title},${a.author},${a.digest},${a.update_time}`);
  const csv = '标题,作者,摘要,时间\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'articles.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// 启动
startLogin(); 