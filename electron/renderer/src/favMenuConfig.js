import { Document, User } from '@element-plus/icons-vue';
import FavArticleContent from './components/FavArticleContent.vue';
import FavGzhContent from './components/FavGzhContent.vue';

export default [
  {
    key: 'article',
    label: '文章收藏',
    icon: Document,
    mainComponent: FavArticleContent,
  },
  {
    key: 'gzh',
    label: '公众号收藏',
    icon: User,
    mainComponent: FavGzhContent,
  },
  // 新收藏类型可在此处继续添加
]; 