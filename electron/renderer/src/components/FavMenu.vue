<template>
  <div class="fav-menu-panel">
    <el-menu :default-active="active" @select="onSelectMenu" class="fav-menu">
      <el-menu-item index="article">文章收藏</el-menu-item>
      <el-menu-item index="gzh">公众号收藏</el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const emit = defineEmits(['select']);
const active = ref('article');
function onSelectMenu(key) {
  active.value = key;
  emit('select', key);
}
</script>

<style scoped>
.fav-menu-panel {
  padding: 16px 0 0 0;
}
.fav-menu {
  border-right: none;
}
</style> 