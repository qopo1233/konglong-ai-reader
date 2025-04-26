import { User, Star } from '@element-plus/icons-vue';
import GzhSearch from './components/GzhSearch.vue';
import ArticleList from './components/ArticleList.vue';
import FavMenu from './components/FavMenu.vue';
// import FavContent from './components/FavContent.vue';

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
  // 新菜单可在此处继续添加
]; 