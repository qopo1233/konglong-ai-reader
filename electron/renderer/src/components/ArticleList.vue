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
        <el-button class="float-right" size="small" @click="exportArticles" :disabled="!articles.length">导出</el-button>
      </template>
      <el-table :data="articles" style="width:100%;" row-class-name="fixed-row-height">
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" show-overflow-tooltip />
        <el-table-column prop="digest" label="摘要" show-overflow-tooltip />
        <el-table-column prop="update_time" label="时间">
          <template #default="scope">{{ formatDate(scope.row.update_time) }}</template>
        </el-table-column>
        <el-table-column label="链接">
          <template #default="scope">
            <el-button @click.prevent="openArticle(scope.row.link)">原文</el-button>
            <el-button
              size="small"
              :type="articleFavMap[scope.row.msgid] ? 'warning' : 'info'"
              @click.stop="toggleArticleFav(scope.row)"
              style="margin-left: 8px;"
            >
              {{ articleFavMap[scope.row.msgid] ? '取消收藏' : '收藏' }}
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
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
const props = defineProps({ selectedGzh: Object });
const articles = ref([]);
const totalArticles = ref(0);
const pageSize = 5;
const currentPage = ref(0);
const gzhFav = ref(false);
const articleFavMap = ref({});

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
    if (!a.msgid) continue;
    map[a.msgid] = await window.electronAPI.invoke('is-fav-article', a.msgid);
  }
  articleFavMap.value = map;
}

async function toggleArticleFav(article) {
  if (!article.msgid) return;
  const pureArticle = JSON.parse(JSON.stringify(article));
  console.log('[前端] 点击收藏文章', pureArticle);
  const res = await window.electronAPI.invoke('toggle-fav-article', {
    ...pureArticle,
    fakeid: props.selectedGzh.fakeid
  });
  console.log('[前端] toggle-fav-article 返回', res);
  articleFavMap.value = {
    ...articleFavMap.value,
    [article.msgid]: res.fav
  };
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

function getProxyUrl(url) {
  return `http://localhost:30099/proxy-img?url=${encodeURIComponent(url)}`;
}

function openArticle(link) {
  window.electronAPI.invoke('open-article', link);
}

onMounted(() => {
  updateGzhFav();
  window.addEventListener('fav-gzh-changed', updateGzhFav);
});

onBeforeUnmount(() => {
  window.removeEventListener('fav-gzh-changed', updateGzhFav);
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