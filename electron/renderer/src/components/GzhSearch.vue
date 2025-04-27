<template>
  <div class="gzh-search-root" ref="panelRef">
    <div class="gzh-search-left">
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="输入公众号名称..." clearable @keyup.enter="searchGzh" />
        <el-button type="primary" @click="searchGzh" :loading="searching">搜索</el-button>
      </div>
      <el-table v-if="gzhList.length" :data="gzhList" style="width:100%;margin-top:12px;cursor:pointer;flex:1;" @row-click="onSelect" highlight-current-row>
        <el-table-column label="头像" width="60">
          <template #default="scope">
            <img :src="getProxyUrl(scope.row.round_head_img)" class="gzh-avatar" alt="头像" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="公众号名称" />
        <el-table-column prop="alias" label="微信号" />
      </el-table>
      <el-empty v-else description="请输入关键词搜索公众号" style="margin-top:24px;" />
    </div>
    <div class="gzh-search-right">
      <div v-if="selectedGzh" class="selected-gzh-info">
        <el-card class="gzh-info-card" shadow="never">
          <template #header>
            <img v-if="selectedGzh.round_head_img" :src="getProxyUrl(selectedGzh.round_head_img)" class="gzh-avatar-header" alt="头像" />
            <span>{{ selectedGzh.nickname }}</span>
            <el-button size="small" style="float:right;" @click="clearSelectedGzh">重新选择</el-button>
          </template>
          <div>微信号：{{ selectedGzh.alias }}</div>
        </el-card>
        <ArticleList :selected-gzh="selectedGzh" style="margin-top:24px;" />
      </div>
      <el-empty v-else description="请在左侧选择公众号" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import ArticleList from './ArticleList.vue';
import { useProxyImg } from './ProxyImgMixin';

const props = defineProps({ selectedGzh: Object });
const keyword = ref('');
const searching = ref(false);
const gzhList = ref([]);
const selectedGzh = ref(null);
const panelRef = ref(null);

const { getProxyUrl } = useProxyImg();

async function searchGzh() {
  if (!keyword.value.trim()) return;
  searching.value = true;
  const result = await window.electronAPI.invoke('search-gzh', keyword.value.trim());
  searching.value = false;
  if (result.error) {
    ElMessage.error('查询出错：' + result.error);
    gzhList.value = [];
    return;
  }
  gzhList.value = result.list || [];
}

function onSelect(row) {
  selectedGzh.value = row;
}

function clearSelectedGzh() {
  selectedGzh.value = null;
}

function handleClickOutside(e) {
  if (!panelRef.value) return;
  if (!panelRef.value.contains(e.target)) {
    gzhList.value = [];
  }
}

watch(gzhList, (val) => {
  if (val.length) {
    document.addEventListener('mousedown', handleClickOutside);
  } else {
    document.removeEventListener('mousedown', handleClickOutside);
  }
});

watch(() => props.selectedGzh, (val) => {
  if (val && val.fakeid) {
    selectedGzh.value = val;
  }
}, { immediate: true });

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.gzh-search-root {
  display: flex;
  height: 100%;
  min-height: 0;
}
.gzh-search-left {
  width: 260px;
  border-right: 1px solid #e4e7ed;
  background: #f8fafc;
  padding: 16px 0 0 0;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.gzh-search-right {
  flex: 1;
  padding: 32px 24px 0 24px;
  min-width: 0;
  background: #fff;
  overflow: auto;
  height: 100%;
  min-height: 0;
}
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
  padding: 0 16px;
}
.gzh-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eee;
  object-fit: cover;
}
.gzh-info-card {
  min-width: 300px;
  margin-bottom: 0;
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
.selected-gzh-info {
  margin-top: 0;
}
</style> 