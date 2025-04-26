<template>
  <div class="settings-root">
    <div class="settings-left">
      <el-menu :default-active="active" @select="onSelectMenu" class="settings-menu">
        <el-menu-item
          v-for="item in settingsMenuConfig"
          :key="item.key"
          :index="item.key"
        >
          <el-icon v-if="item.icon" style="margin-right:4px"><component :is="item.icon" /></el-icon>
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </div>
    <div class="settings-right">
      <component
        v-if="getMenuByKey(active)"
        :is="getMenuByKey(active).mainComponent"
      />
      <el-empty v-else description="请选择设置项" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import settingsMenuConfig from '../SettingsMenuConfig';
const active = ref(settingsMenuConfig[0].key);
function onSelectMenu(key) {
  active.value = key;
}
function getMenuByKey(key) {
  return settingsMenuConfig.find(i => i.key === key);
}
</script>

<style scoped>
.settings-root {
  display: flex;
  height: 100%;
}
.settings-left {
  width: 180px;
  border-right: 1px solid #e4e7ed;
  background: #f8fafc;
  padding-top: 16px;
}
.settings-right {
  flex: 1;
  padding: 32px 24px 0 24px;
  min-width: 0;
  background: #fff;
  overflow: auto;
}
.settings-menu {
  border-right: none;
}
</style> 