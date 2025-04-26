<template>
  <el-table
    v-if="favArticleList.length"
    :data="favArticleList"
    style="width: 100%;"
    row-class-name="fixed-row-height"
  >
    <el-table-column prop="title" label="标题" show-overflow-tooltip />
    <el-table-column prop="author" label="作者" :width="80" show-overflow-tooltip />
    <el-table-column prop="digest" label="摘要" :min-width="100" show-overflow-tooltip />
    <el-table-column prop="update_time" label="时间" :width="130">
      <template #default="scope">{{ formatDate(scope.row.update_time) }}</template>
    </el-table-column>
    <el-table-column label="操作" :width="200">
      <template #default="scope">
        <el-button size="small" @click="openArticle(scope.row.link, scope.row.title)">原文</el-button>
        <el-button size="small" type="danger" @click="removeArticleFav(scope.row)">取消收藏</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-empty v-else description="暂无已收藏的文章" />
</template>

<script setup>
import { ref, onMounted } from 'vue';
const favArticleList = ref([]);

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

async function fetchFavArticleList() {
  favArticleList.value = await window.electronAPI.invoke('get-fav-article-list');
}

async function removeArticleFav(article) {
  const pureArticle = JSON.parse(JSON.stringify(article));
  await window.electronAPI.invoke('toggle-fav-article', pureArticle);
  fetchFavArticleList();
}

function openArticle(link, title) {
  window.electronAPI.invoke('open-article', { link, title });
}

onMounted(() => {
  fetchFavArticleList();
});
</script>

<style scoped>
</style> 