<template>
  <el-card class="login-card" shadow="hover">
    <template #header>
      <span>1. 扫码登录</span>
    </template>
    <div class="qrcode-box" v-if="!loggedIn">
      <el-skeleton :loading="loading" animated>
        <template #template>
          <el-skeleton-item variant="image" style="width:200px;height:200px;" />
        </template>
        <img v-if="qrcode" :src="qrcode" class="qrcode-img" alt="请扫码登录" />
      </el-skeleton>
      <div class="login-status">{{ status }}</div>
    </div>
    <el-result v-else icon="success" title="登录成功" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const emit = defineEmits(['login-success']);
const qrcode = ref('');
const status = ref('正在检测登录状态...');
const loading = ref(true);
const loggedIn = ref(false);

async function fetchQrcode() {
  status.value = '正在检测登录状态...';
  loading.value = true;
  qrcode.value = '';
  const result = await window.electronAPI.invoke('get-qrcode');
  loading.value = false;
  if (result.error) {
    status.value = '二维码获取失败: ' + result.error;
    return;
  }
  if (result.loggedIn) {
    status.value = '已登录，无需扫码';
    loggedIn.value = true;
    emit('login-success');
    return;
  }
  qrcode.value = result.qrcode;
  status.value = '请扫码登录微信公众号后台';
  pollLogin();
}

function pollLogin() {
  let timer = setInterval(async () => {
    status.value = '正在检测扫码结果...';
    const res = await window.electronAPI.invoke('check-login');
    if (res.status === 'success') {
      clearInterval(timer);
      status.value = '登录成功！';
      loggedIn.value = true;
      emit('login-success');
    }
  }, 1500);
}

onMounted(fetchQrcode);
</script>

<style scoped>
.login-card {
  max-width: 400px;
  margin: 40px auto;
}
.qrcode-box {
  text-align: center;
}
.qrcode-img {
  width: 200px;
  height: 200px;
  border: 1px solid #eee;
  background: #fafafa;
  display: inline-block;
}
.login-status {
  margin-top: 16px;
  color: #888;
}
</style> 