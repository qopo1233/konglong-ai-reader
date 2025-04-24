<template>
  <el-container style="height: 100vh;" v-if="isLoggedIn">
    <!-- 最左侧图标栏 -->
    <el-aside width="60px" class="icon-bar">
      <div
        v-for="item in navList"
        :key="item.key"
        :class="['icon-item', {active: activeNav === item.key}]"
        @click="activeNav = item.key"
        :title="item.label"
      >
        <el-icon :size="28"><component :is="item.icon" /></el-icon>
      </div>
    </el-aside>
    <!-- 中间子功能区 -->
    <el-aside width="260px" class="sub-menu">
      <keep-alive>
        <component :is="navList.find(i => i.key === activeNav).sideComponent" @select="onSelect" />
      </keep-alive>
    </el-aside>
    <!-- 右侧主内容区 -->
    <el-main class="main-panel">
      <keep-alive>
        <component
          :is="navList.find(i => i.key === activeNav).mainComponent"
          :selected-gzh="selectedGzh"
          :selected="favTab"
          @jump-to-gzh="handleJumpToGzh"
        />
      </keep-alive>
    </el-main>
  </el-container>
  <QrcodeLogin v-else @login-success="handleLoginSuccess" />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { User, Star } from '@element-plus/icons-vue';
import GzhSearch from './components/GzhSearch.vue';
import ArticleList from './components/ArticleList.vue';
import FavMenu from './components/FavMenu.vue';
import FavContent from './components/FavContent.vue';
import QrcodeLogin from './components/QrcodeLogin.vue';

const navList = [
  { key: 'gzh', label: '公众号', icon: User, sideComponent: GzhSearch, mainComponent: ArticleList },
  { key: 'fav', label: '收藏夹', icon: Star, sideComponent: FavMenu, mainComponent: FavContent },
];
const activeNav = ref('gzh');
const selectedGzh = ref(null);
const favTab = ref('article');
const isLoggedIn = ref(false);

function onSelect(item) {
  if (activeNav.value === 'fav') {
    favTab.value = item;
  } else {
    selectedGzh.value = item;
  }
}

function handleLoginSuccess() {
  isLoggedIn.value = true;
}

function handleJumpToGzh(gzh) {
  activeNav.value = 'gzh';
  selectedGzh.value = gzh;
}

onMounted(async () => {
  const res = await window.electronAPI.invoke('check-login');
  if (res.status === 'success') {
    isLoggedIn.value = true;
  }
});
</script>

<style>
body, html, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
.el-container {
  height: 100vh;
}
.icon-bar {
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 12px;
}
.icon-item {
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.icon-item.active, .icon-item:hover {
  background: #e0f0ff;
}
.sub-menu {
  background: #f8fafc;
  border-right: 1px solid #e4e7ed;
  padding: 0;
  min-width: 200px;
}
.main-panel {
  background: #fff;
  padding: 0 0 0 0;
  height: 100%;
}
</style> 