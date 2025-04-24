<template>
  <div class="gzh-search-panel" ref="panelRef">
    <div class="search-bar">
      <el-input v-model="keyword" placeholder="输入公众号名称..." clearable @keyup.enter="searchGzh" />
      <el-button type="primary" @click="searchGzh" :loading="searching">搜索</el-button>
    </div>
    <el-table v-if="gzhList.length" :data="gzhList" style="width:100%;margin-top:12px;cursor:pointer;" @row-click="onSelect" highlight-current-row>
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
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage } from 'element-plus';
const emit = defineEmits(['select']);
const keyword = ref('');
const searching = ref(false);
const gzhList = ref([]);
const panelRef = ref(null);

function getProxyUrl(url) {
  return `http://localhost:30099/proxy-img?url=${encodeURIComponent(url)}`;
}

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
  emit('select', row);
  gzhList.value = [];
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

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.gzh-search-panel {
  padding: 16px 8px 0 8px;
}
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
}
.gzh-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eee;
  object-fit: cover;
}
</style> 