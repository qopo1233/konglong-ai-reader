<template>
  <el-container style="height: 100vh;" v-if="isLoggedIn">
    <!-- 最左侧图标栏 -->
    <el-aside width="60px" class="icon-bar">
      <div>
        <div
          v-for="item in topMenus"
          :key="item.key"
          :class="['icon-item', {active: activeNav === item.key}]"
          @click="activeNav = item.key"
          :title="item.label"
        >
          <el-icon :size="28"><component :is="item.icon" /></el-icon>
        </div>
      </div>
      <div style="flex:1"></div>
      <div>
        <div
          v-for="item in bottomMenus"
          :key="item.key"
          :class="['icon-item', {active: activeNav === item.key}]"
          @click="activeNav = item.key"
          :title="item.label"
        >
          <el-icon :size="28"><component :is="item.icon" /></el-icon>
        </div>
      </div>
    </el-aside>
    <!-- 主内容区 -->
    <el-main class="main-panel">
      <keep-alive>
        <component
          :is="getMenuByKey(activeNav).mainComponent"
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
import { ref, computed, onMounted } from 'vue';
import menuConfig from './menuConfig';
import QrcodeLogin from './components/QrcodeLogin.vue';

const activeNav = ref(menuConfig[0].key);
const selectedGzh = ref(null);
const favTab = ref('article');
const isLoggedIn = ref(false);

const topMenus = computed(() => menuConfig.filter(i => i.position !== 'bottom'));
const bottomMenus = computed(() => menuConfig.filter(i => i.position === 'bottom'));

function getMenuByKey(key) {
  return menuConfig.find(i => i.key === key);
}

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
.main-panel {
  background: #fff;
  padding: 0 0 0 0;
  height: 100%;
}
</style> 