<template>
  <div class="article-list-panel">
    <el-card v-if="selectedGzh" class="article-card" shadow="never">
      <template #header>
        <img v-if="selectedGzh.round_head_img" :src="getProxyUrl(selectedGzh.round_head_img)" class="gzh-avatar-header" alt="头像" />
        <span>{{ selectedGzh.nickname || '文章列表' }}</span>
        <el-button
          v-if="selectedGzh"
          size="small"
          :type="gzhFav ? 'warning' : 'info'"
          @click="toggleGzhFav"
          style="margin-left: 12px;"
        >
          {{ gzhFav ? '取消收藏' : '收藏公众号' }}
        </el-button>
        <!-- <el-button class="float-right" size="small" @click="exportArticles" :disabled="!articles.length">导出</el-button> -->
      </template>
      <el-table :data="articles" style="width:100%;" row-class-name="fixed-row-height" @row-click="handleRowClick" v-loading="loading">
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" show-overflow-tooltip :width="80" />
        <el-table-column prop="digest" label="摘要" show-overflow-tooltip :min-width="100" />
        <el-table-column prop="update_time" label="时间" :width="130">
          <template #default="scope">{{ formatDate(scope.row.update_time) }}</template>
        </el-table-column>
        <el-table-column label="链接">
          <template #default="scope">
            <el-button @click.prevent="openArticle(scope.row.link, scope.row.title)">原文</el-button>
            <el-button
              size="small"
              :type="articleFavMap[scope.row.appmsgid] ? 'warning' : 'info'"
              @click.stop="toggleArticleFav(scope.row)"
              style="margin-left: 8px;"
            >
              {{ articleFavMap[scope.row.appmsgid] ? '取消收藏' : '收藏' }}
            </el-button>
            <el-button
              size="small"
              :type="'primary'"
              @click.stop="aiReadArticle(scope.row)"
              style="margin-left: 8px;"
            >
              AI阅读
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-bar">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="totalArticles"
          :page-size="pageSize"
          :current-page="currentPage+1"
          @current-change="onPageChange"
          :pager-count="11"
        />
      </div>
    </el-card>
    <el-empty v-else description="请先选择公众号" />
    <el-dialog
      v-model="aiDialogVisible"
      :title="`AI总结${aiArticleTitle ? ' - ' + aiArticleTitle : ''}`"
      width="800px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="true"
      class="ai-summary-box"
    >
      <div v-if="aiSummary" class="markdown-body" v-html="md.render(aiSummary)"></div>
      <div v-if="aiDone" style="color:#67c23a;margin-top:1em;">AI总结已完成</div>
      <div v-else-if="!aiSummary" style="color:#888;font-style:italic;">AI正在总结中，请稍候...</div>
      <template #footer>
        <el-button @click="aiDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox, ElDialog, ElButton } from 'element-plus';
import MarkdownIt from 'markdown-it';
import { h } from 'vue';
import { useProxyImg } from './ProxyImgMixin';
const props = defineProps({ selectedGzh: Object });
const articles = ref([]);
const totalArticles = ref(0);
const pageSize = 5;
const currentPage = ref(0);
const gzhFav = ref(false);
const articleFavMap = ref({});
const aiSummary = ref('');
const aiDone = ref(false);
const aiDialogVisible = ref(false);
const aiArticleTitle = ref('');
let aiStreamBox = null;
const md = new MarkdownIt();
const loading = ref(false);
const { getProxyUrl } = useProxyImg();

function formatDate(dateStr) {
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

async function fetchArticles() {
  loading.value = true;
  try {
    if (!props.selectedGzh) return;
    if (!props.selectedGzh.fakeid) return;
    const result = await window.electronAPI.invoke('get-articles', {
      fakeid: props.selectedGzh.fakeid,
      pageIndex: currentPage.value,
      pageSize
    });
    if (result.error) {
      ElMessage.error('获取文章出错：' + result.error);
      articles.value = [];
      totalArticles.value = 0;
      return;
    }
    articles.value = (result.articles || []).map(a => ({
      ...a,
      link: a.link || a.url || a.msg_link || ''
    }));
    totalArticles.value = result.totalCount;
    // 查询每篇文章的收藏状态
    updateArticleFavMap();
  } finally {
    loading.value = false;
  }
}

async function updateGzhFav() {
  if (!props.selectedGzh || !props.selectedGzh.fakeid) {
    gzhFav.value = false;
    return;
  }
  gzhFav.value = await window.electronAPI.invoke('is-fav-gzh', props.selectedGzh.fakeid);
}

async function toggleGzhFav() {
  if (!props.selectedGzh) return;
  const pureGzh = JSON.parse(JSON.stringify(props.selectedGzh));
  console.log('[前端] 点击收藏公众号', pureGzh);
  await window.electronAPI.invoke('toggle-fav-gzh', pureGzh);
  // 操作后强制刷新
  await updateGzhFav();
}

async function updateArticleFavMap() {
  const map = {};
  for (const a of articles.value) {
    if (!a.appmsgid) continue;
    map[a.appmsgid] = await window.electronAPI.invoke('is-fav-article', a.appmsgid);
  }
  articleFavMap.value = map;
}

async function toggleArticleFav(article) {
  if (!article.appmsgid) return;
  const pureArticle = JSON.parse(JSON.stringify(article));
  console.log('[前端] 点击收藏文章', pureArticle);
  await window.electronAPI.invoke('toggle-fav-article', {
    ...pureArticle,
    fakeid: props.selectedGzh.fakeid
  });
  // 操作后强制刷新所有收藏状态
  await updateArticleFavMap();
}

watch(() => props.selectedGzh, () => {
  currentPage.value = 0;
  fetchArticles();
  updateGzhFav();
}, { immediate: true });

function onPageChange(page) {
  currentPage.value = page - 1;
  fetchArticles();
}

function exportArticles() {
  if (!articles.value.length) return;
  const rows = articles.value.map(a => `${a.title},${a.author},${a.digest},${formatDate(a.update_time)},${a.link}`);
  const csv = '标题,作者,摘要,时间,链接\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'articles.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function openArticle(link, title) {
  window.electronAPI.invoke('open-article', { link, title });
}

function aiReadArticle(article) {
  console.log('[前端] AI阅读按钮点击', article);
  if (!article.appmsgid) {
    console.error('[前端] appmsgid', article);
    return;
  }
  const pureArticle = JSON.parse(JSON.stringify(article));
  aiSummary.value = '';
  aiDone.value = false;
  aiDialogVisible.value = true;
  aiArticleTitle.value = article.title || '';
  window.electronAPI.send('ai-read-article-stream', pureArticle);
}

function handleAiStream(event, data) {
  if (data?.content) {
    aiSummary.value += data.content;
  }
  if (data?.error) {
    aiDialogVisible.value = false;
    ElMessageBox({
      title: 'AI总结失败',
      message: () => h('div', { class: 'markdown-body', innerHTML: md.render(data.error) }),
      dangerouslyUseHTMLString: true,
      customClass: 'ai-summary-box',
    });
  }
  if (data?.done) {
    console.log('[AI流式] done收到，aiSummary:', aiSummary.value);
    aiDone.value = true;
  }
}

function handleRowClick(row) {
  if (!row.link) return;
  window.electronAPI.invoke('copy-article-link', row.link).then(() => {
    ElMessage({
      message: '复制链接成功',
      type: 'success',
      duration: 2000,
      showClose: false
    });
  });
}

onMounted(() => {
  updateGzhFav();
  window.addEventListener('fav-gzh-changed', updateGzhFav);
  if (window.electronAPI?.on) {
    window.electronAPI.on('ai-read-article-stream', handleAiStream);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('fav-gzh-changed', updateGzhFav);
  if (window.electronAPI?.removeListener) {
    window.electronAPI.removeListener('ai-read-article-stream', handleAiStream);
  }
});
</script>

<style scoped>
.article-list-panel {
  padding: 16px 8px 0 8px;
}
.article-card {
  min-height: 400px;
}
.float-right {
  float: right;
}
.pagination-bar {
  margin: 16px 0 0 0;
  display: flex;
  justify-content: center;
  width: 100%;
}
.gzh-avatar-header {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
  background: #eee;
  object-fit: cover;
}
</style>

<style>
.markdown-body {
  font-size: 15px;
  line-height: 1.7;
  color: #222;
  background: none;
  padding: 0;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  margin: 1em 0 0.5em;
  font-weight: bold;
}
.markdown-body p {
  margin: 0.5em 0;
}
.markdown-body code {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 90%;
}
.markdown-body pre {
  background: #f6f8fa;
  padding: 8px 12px;
  border-radius: 4px;
  overflow-x: auto;
}
.markdown-body ul, .markdown-body ol {
  margin: 0.5em 0 0.5em 1.5em;
}
.ai-summary-box {
  width: 1000px !important;
  max-width: 90vw;
}
</style> 