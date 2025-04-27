import { ref, onMounted } from 'vue';

export function useProxyImg() {
  const proxyPort = ref(30099);

  async function fetchProxyPort() {
    if (window.electronAPI?.invoke) {
      proxyPort.value = await window.electronAPI.invoke('get-proxy-port');
    }
  }

  function getProxyUrl(url) {
    return `http://localhost:${proxyPort.value}/proxy-img?url=${encodeURIComponent(url)}`;
  }

  onMounted(fetchProxyPort);

  return { proxyPort, getProxyUrl };
} 