import { Cpu } from '@element-plus/icons-vue';
import ModelConfigPanel from './components/ModelConfigPanel.vue';

export default [
  {
    key: 'model',
    label: '模型配置',
    icon: Cpu,
    mainComponent: ModelConfigPanel,
  },
  // 未来可继续添加更多设置项
]; 