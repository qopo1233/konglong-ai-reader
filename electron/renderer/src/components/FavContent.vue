<template>
  <div class="fav-content-panel">
    <div v-if="selected === 'article'">
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
    </div>
    <div v-else-if="selected === 'gzh'">
      <div v-if="gzhList.length">
        <el-list>
          <el-list-item v-for="gzh in gzhList" :key="gzh.fakeid" class="gzh-fav-item" @click="handleGzhClick(gzh)" style="cursor:pointer">
            <img :src="getProxyUrl(gzh.round_head_img)" class="gzh-avatar" alt="头像" />
            <div class="gzh-info">
              <div class="gzh-nickname">{{ gzh.nickname }}</div>
              <div class="gzh-alias">{{ gzh.alias }}</div>
            </div>
            <el-button size="small" type="danger" @click.stop="removeGzhFav(gzh)">取消收藏</el-button>
          </el-list-item>
        </el-list>
      </div>
      <el-empty v-else description="暂无已收藏的公众号" />
    </div>
    <div v-else>
      <el-empty description="请选择收藏类型" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ selected: String });
const gzhList = ref([]);
const favArticleList = ref([]);
const emit = defineEmits(['jump-to-gzh']);

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

async function fetchFavGzhList() {
  gzhList.value = await window.electronAPI.invoke('get-fav-gzh-list');
}

async function fetchFavArticleList() {
  favArticleList.value = await window.electronAPI.invoke('get-fav-article-list');
}

async function removeGzhFav(gzh) {
  const pureGzh = JSON.parse(JSON.stringify(gzh));
  await window.electronAPI.invoke('toggle-fav-gzh', pureGzh);
  fetchFavGzhList();
  window.dispatchEvent(new CustomEvent('fav-gzh-changed', { detail: pureGzh.fakeid }));
}

async function removeArticleFav(article) {
  const pureArticle = JSON.parse(JSON.stringify(article));
  await window.electronAPI.invoke('toggle-fav-article', pureArticle);
  fetchFavArticleList();
}

function getProxyUrl(url) {
  return `http://localhost:30099/proxy-img?url=${encodeURIComponent(url)}`;
}

function handleGzhClick(gzh) {
  emit('jump-to-gzh', gzh);
}

function openArticle(link, title) {
  window.electronAPI.invoke('open-article', { link, title });
}

watch(() => props.selected, (val) => {
  if (val === 'gzh') fetchFavGzhList();
  if (val === 'article') fetchFavArticleList();
}, { immediate: true });
</script>

<style scoped>
.fav-content-panel {
  padding: 32px;
}
.gzh-fav-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  background: #fafbfc;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 1px 4px #0001;
}
.gzh-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 16px;
  background: #eee;
}
.gzh-info {
  flex: 1;
}
.gzh-nickname {
  font-weight: bold;
  font-size: 16px;
}
.gzh-alias {
  color: #888;
  font-size: 13px;
}
</style> 