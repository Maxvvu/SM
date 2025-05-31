<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { 
  HomeFilled, 
  User, 
  List, 
  TrendCharts, 
  ArrowDown, 
  SwitchButton,
  Fold,
  Expand,
  Upload,
  Setting,
  Document
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)

const isLoggedIn = computed(() => {
  return localStorage.getItem('token')
})

const handleCommand = (command) => {
  if (command === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    router.push('/login')
    ElMessage.success('退出登录成功')
  }
}
</script>

<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
}

#app {
  height: 100%;
}

.el-menu-item.is-active {
  background-color: #263445 !important;
}

.el-sub-menu.is-active .el-sub-menu__title {
  color: #409EFF !important;
}
</style>
