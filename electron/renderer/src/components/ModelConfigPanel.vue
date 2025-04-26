<template>
  <div class="model-config-panel">
    <h3>模型配置</h3>
    <el-divider />
    <el-form label-width="100px" style="max-width:400px;">
      <el-form-item label="API Base URL">
        <el-input v-model="form.baseUrl" placeholder="如 https://api.openai.com/v1" clearable />
      </el-form-item>
      <el-form-item label="模型名称">
        <el-input v-model="form.model" placeholder="如 gpt-3.5-turbo" clearable />
      </el-form-item>
      <el-form-item label="流式输出">
        <el-switch v-model="form.stream" />
      </el-form-item>
      <el-form-item label="API Key">
        <el-input v-model="form.apiKey" placeholder="sk-..." show-password clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
const form = ref({
  baseUrl: '',
  model: '',
  stream: false,
  apiKey: '',
});

async function loadConfig() {
  const res = await window.electronAPI.invoke('get-openai-config');
  form.value.baseUrl = res.base_url || '';
  form.value.model = res.model || '';
  form.value.stream = !!res.stream;
  form.value.apiKey = res.api_key || '';
}

async function saveConfig() {
  await window.electronAPI.invoke('set-openai-config', {
    base_url: form.value.baseUrl,
    model: form.value.model,
    stream: form.value.stream,
    api_key: form.value.apiKey,
  });
  ElMessage.success('保存成功，已写入本地数据库');
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.model-config-panel {
  max-width: 600px;
  margin: 0 auto;
}
</style> 