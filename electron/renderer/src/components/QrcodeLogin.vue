<template>
  <div class="login-bg">
    <div class="login-card-simple">
      <div class="login-header-simple">登录微信阅读器</div>
      <div class="qrcode-box-simple" v-if="!loggedIn">
        <template v-if="qrcode">
          <div class="qrcode-img-wrap-simple">
            <img :src="qrcode" class="qrcode-img-simple" alt="请扫码登录" />
          </div>
          <div class="login-tip-simple">请使用 <b>微信</b> 扫描二维码登录</div>
        </template>
        <div class="login-status-simple" :class="{ success: loggedIn, error: status.includes('失败') }">{{ status }}</div>
      </div>
      <el-result v-else icon="success" title="登录成功" />
    </div>
  </div>
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
.login-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card-simple {
  background: #fff;
  border-radius: 20px;
  padding: 40px 32px 32px 32px;
  box-shadow: 0 2px 24px 0 #0001;
  min-width: 320px;
  max-width: 96vw;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.login-header-simple {
  font-size: 2rem;
  font-weight: 700;
  color: #222;
  text-align: center;
  margin-bottom: 32px;
  letter-spacing: 1px;
}
.qrcode-box-simple {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qrcode-img-wrap-simple {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 18px;
}
.qrcode-img-simple {
  width: 220px;
  height: 220px;
  border-radius: 18px;
  border: 1.5px solid #e0e7ef;
  background: #fff;
  box-shadow: 0 2px 16px #0001;
  display: block;
}
.login-tip-simple {
  color: #666;
  font-size: 15px;
  margin-bottom: 10px;
  margin-top: -6px;
  letter-spacing: 0.5px;
}
.login-status-simple {
  margin-top: 18px;
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 1px;
  transition: color 0.2s;
  text-align: center;
}
.login-status-simple.error {
  color: #e74c3c;
}
.login-status-simple.success {
  color: #67c23a;
}
@media (max-width: 600px) {
  .login-card-simple {
    min-width: 0;
    padding: 24px 2vw 18px 2vw;
  }
  .qrcode-img-simple {
    width: 70vw;
    height: 70vw;
    min-width: 120px;
    min-height: 120px;
    max-width: 90vw;
    max-height: 90vw;
  }
  .login-header-simple {
    font-size: 1.3rem;
    margin-bottom: 18px;
  }
}
</style> 