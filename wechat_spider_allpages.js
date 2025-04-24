const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { getUserAgent } = require('./agent');
const readline = require('readline');
const e = require('cors');

/**
 * 获取公众号历史文章列表（新版参数适配）
 * @param {object} page Puppeteer页面对象
 * @param {string} fakeid 公众号fakeid
 * @param {number} begin 起始位置，分页用
 * @param {number} count 每页数量
 * @param {string} fingerprint 指纹参数（可选，建议从页面获取）
 * @param {string} token 登录token
 * @returns {Promise<object>} 返回接口原始数据
 */
async function getArticles(page, fakeid, begin = 0, count = 5, fingerprint = '', token = '') {
  // 获取token
  if (!token) {
    const url = page.url();
    const tokenMatch = url.match(/token=(\d+)/);
    token = tokenMatch ? tokenMatch[1] : null;
    if (!token) {
      throw new Error('未能获取到token，请确保已登录并跳转到后台主页');
    }
  }

  // 获取cookie
  const cookies = await page.cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // 构造请求参数
  const listUrl = 'https://mp.weixin.qq.com/cgi-bin/appmsgpublish';
  const params = new URLSearchParams({
    sub: 'list',
    search_field: 'null',
    begin: begin.toString(),
    count: count.toString(),
    query: '',
    fakeid: fakeid,
    type: '101_1',
    free_publish_type: '1',
    sub_action: 'list_ex',
    fingerprint: fingerprint,
    token: token,
    lang: 'zh_CN',
    f: 'json',
    ajax: '1'
  });
  const headers = {
    'Cookie': cookieStr,
    'User-Agent': getUserAgent(),
    'Referer': `https://mp.weixin.qq.com/`,
    'Accept': 'application/json, text/javascript, */*; q=0.01'
  };

  try {
    const res = await axios.get(`${listUrl}?${params.toString()}`, { headers });
    if (res.data && res.data.base_resp && res.data.base_resp.ret === 0) {
      // 解析publish_page
      let publishPage = res.data.publish_page;
      if (typeof publishPage === 'string') {
        publishPage = JSON.parse(publishPage);
      }
      const publishList = publishPage.publish_list || [];
      let articles = [];
      for (const pub of publishList) {
        let info = pub.publish_info;
        if (typeof info === 'string' && info.trim().length > 0) {
          if (info.includes('该内容已被删除')) {
            console.info('文章已被删除');
            continue;
          }
          info = JSON.parse(info);
        }else {
          console.info('文章有问题', info);
          continue;
        }
        // appmsgex 是文章数组
        if (Array.isArray(info.appmsgex)) {
          for (const item of info.appmsgex) {
            articles.push({
              title: item.title,
              link: item.link.replace(/\\\\\//g, '/').replace(/\\\//g, '/'),
              cover: item.cover.replace(/\\\\\//g, '/').replace(/\\\//g, '/'),
              digest: item.digest,
              author: item.author_name,
              update_time: item.update_time,
              appmsgid: item.appmsgid,
              itemidx: item.itemidx
            });
          }
        }
      }
      return { articles: articles, totalCount: publishPage.total_count };
    } else {
      console.error('获取文章列表失败:', res.data.base_resp ? res.data.base_resp.err_msg : res.data);
      return { articles: [], totalCount: 0 };
    }
  } catch (e) {
    console.error('请求文章列表接口失败:', e.message);
    return { articles: [], totalCount: 0 };
  }
}

/**
 * 分页获取所有文章链接并保存到urls.txt，严格根据totalCount分页
 * @param {object} page Puppeteer页面对象
 * @param {string} fakeid 公众号fakeid
 * @param {string} fingerprint 指纹参数（可选）
 * @param {string} token 登录token
 * @param {number} pageSize 每页数量
 * @param {string} outputPath 输出文件路径
 * @returns {Promise<void>}
 */
async function saveAllArticleUrls(page, fakeid, fingerprint = '', token = '', pageSize = 5, outputPath = 'urls.txt') {
  let begin = 0;
  let allUrls = [];
  let total_count = null;
  while (true) {
    // 调用getArticles获取当前页的文章和总数
    const { articles, totalCount: tc } = await getArticles(page, fakeid, begin, pageSize, fingerprint, token);
    if (total_count === null) total_count = tc;
    if (total_count === 0) {
      console.log('未找到任何文章');
      break;
    }
    // 收集本页所有文章链接
    if (articles && articles.length > 0) {
      allUrls.push(...articles.map(a => a.link));
    }
    begin += pageSize;
    // 只要begin小于totalCount就继续，即使本页无数据
    if (begin >= total_count) break;
    // 每一页访问间隔sleep
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  fs.writeFileSync(outputPath, allUrls.join('\n'), 'utf-8');
  console.log(`已保存所有文章链接到: ${outputPath}`);
}

/**
 * 搜索公众号
 * @param {object} page Puppeteer页面对象
 * @param {string} query 搜索关键词
 * @returns {Promise<Array>} 返回公众号列表，每项包含nickname、fakeid等信息
 */
async function searchGzh(page, query) {
  // 获取token
  const url = page.url();
  const tokenMatch = url.match(/token=(\d+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) {
    throw new Error('未能获取到token，请确保已登录并跳转到后台主页');
  }

  // 获取cookie
  const cookies = await page.cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // 构造请求参数
  const searchUrl = `https://mp.weixin.qq.com/cgi-bin/searchbiz?action=search_biz&token=${token}&lang=zh_CN&f=json&ajax=1&random=${Math.random()}&query=${encodeURIComponent(query)}&begin=0&count=5`;
  const headers = {
    'Cookie': cookieStr,
    'User-Agent': getUserAgent(),
    'Referer': `https://mp.weixin.qq.com/`,
    'Accept': 'application/json, text/javascript, */*; q=0.01'
  };

  // 发起请求
  const res = await axios.get(searchUrl, { headers });
  if (res.data && res.data.list) {
    return res.data.list.map(item => ({
      nickname: item.nickname,
      fakeid: item.fakeid,
      alias: item.alias,
      round_head_img: item.round_head_img
    }));
  }
  return [];
}

/**
 * 命令行交互主流程
 */
// async function main() {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   });

//   // 步骤1：输入公众号名称
//   const askQuestion = (q) => new Promise(resolve => rl.question(q, resolve));
//   const { browser, page } = await gzhLogin();

//   const gzhName = await askQuestion('请输入您要查找的公众号名称：');
//   const accountList = await searchGzh(page, gzhName);

//   if (accountList.length === 0) {
//     console.log('未找到公众号');
//     rl.close();
//     await browser.close();
//     return;
//   }

//   // 步骤2：展示公众号列表并让用户选择
//   console.log('\n查询结果：');
//   accountList.forEach((item, idx) => {
//     console.log(`${idx + 1}. ${item.nickname} (${item.alias || '无别名'})`);
//   });

//   let idx = await askQuestion('\n请输入要选择的公众号序号（1-5）：');
//   idx = parseInt(idx, 10) - 1;
//   if (isNaN(idx) || idx < 0 || idx >= accountList.length) {
//     console.log('输入无效，程序退出。');
//     rl.close();
//     await browser.close();
//     return;
//   }
//   const target = accountList[idx];

//   // 步骤3：确认是否保存所有文章
//   let confirm = await askQuestion(`是否保存【${target.nickname}】的所有文章链接到${target.nickname}.txt？(y/n)：`);
//   if (confirm.trim().toLowerCase() === 'y') {
//     await saveAllArticleUrls(page, target.fakeid, '', '', 5, target.nickname + '.txt');
//     console.log('操作完成。');
//   } else {
//     console.log('已取消保存。');
//   }

//   rl.close();
//   await browser.close();
// }

// main();

module.exports = { searchGzh, getArticles };