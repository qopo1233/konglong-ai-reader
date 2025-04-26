import { User, Star, Setting } from '@element-plus/icons-vue';
import GzhSearch from './components/GzhSearch.vue';
import ArticleList from './components/ArticleList.vue';
import FavMenu from './components/FavMenu.vue';
import SettingsMenu from './components/SettingsMenu.vue';

export default [
  {
    key: 'gzh',
    label: '公众号',
    icon: User,
    position: 'top',
    mainComponent: GzhSearch,
  },
  {
    key: 'fav',
    label: '收藏夹',
    icon: Star,
    position: 'top',
    mainComponent: FavMenu,
  },
  {
    key: 'settings',
    label: '设置',
    icon: Setting,
    position: 'bottom',
    mainComponent: SettingsMenu,
  },
  // 新菜单可在此处继续添加
]; 