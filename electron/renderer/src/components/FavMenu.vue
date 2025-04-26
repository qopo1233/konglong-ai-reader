<template>
  <div class="fav-menu-root">
    <div class="fav-menu-left">
      <el-menu :default-active="active" @select="onSelectMenu" class="fav-menu" :router="false" :collapse="false">
        <el-menu-item
          v-for="item in favMenuConfig"
          :key="item.key"
          :index="item.key"
        >
          <el-icon v-if="item.icon" style="margin-right:4px"><component :is="item.icon" /></el-icon>
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </div>
    <div class="fav-menu-right">
      <component
        v-if="getMenuByKey(active)"
        :is="getMenuByKey(active).mainComponent"
        @jump-to-gzh="gzh => $emit('jump-to-gzh', gzh)"
      />
      <el-empty v-else description="请选择收藏类型" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import favMenuConfig from '../favMenuConfig';
const active = ref(favMenuConfig[0].key);
function onSelectMenu(key) {
  active.value = key;
}
function getMenuByKey(key) {
  return favMenuConfig.find(i => i.key === key);
}
</script>

<style scoped>
.fav-menu-root {
  display: flex;
  height: 100%;
}
.fav-menu-left {
  width: 180px;
  border-right: 1px solid #e4e7ed;
  background: #f8fafc;
  padding-top: 16px;
}
.fav-menu-right {
  flex: 1;
  padding: 32px 24px 0 24px;
  min-width: 0;
  background: #fff;
  overflow: auto;
}
.fav-menu {
  border-right: none;
}
</style> 