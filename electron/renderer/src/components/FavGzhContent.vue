<template>
  <div>
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useProxyImg } from './ProxyImgMixin';

const gzhList = ref([]);
const emit = defineEmits(['jump-to-gzh']);
const { getProxyUrl } = useProxyImg();

async function fetchFavGzhList() {
  gzhList.value = await window.electronAPI.invoke('get-fav-gzh-list');
}

async function removeGzhFav(gzh) {
  const pureGzh = JSON.parse(JSON.stringify(gzh));
  await window.electronAPI.invoke('toggle-fav-gzh', pureGzh);
  fetchFavGzhList();
  window.dispatchEvent(new CustomEvent('fav-gzh-changed', { detail: pureGzh.fakeid }));
}

function handleGzhClick(gzh) {
  emit('jump-to-gzh', gzh);
}

onMounted(() => {
  fetchFavGzhList();
});
</script>

<style scoped>
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