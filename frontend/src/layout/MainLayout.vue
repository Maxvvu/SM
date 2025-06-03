<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '200px'" class="aside">
      <div class="logo" :class="{ 'collapsed': isCollapse }">
        <el-icon class="logo-icon" :size="32">
          <School />
        </el-icon>
        <span v-show="!isCollapse">学生管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        :collapse="isCollapse"
        :collapse-transition="false"
        @select="handleSelect"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <template #title>首页</template>
        </el-menu-item>

        <el-sub-menu index="student">
          <template #title>
            <el-icon><User /></el-icon>
            <span>学生管理</span>
          </template>
          <el-menu-item index="/students">学生列表</el-menu-item>
          <el-menu-item index="/student-import">学生导入</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="behavior">
          <template #title>
            <el-icon><List /></el-icon>
            <span>行为管理</span>
          </template>
          <el-menu-item index="/behaviors">行为记录管理</el-menu-item>
          <el-menu-item index="/behavior-types">行为类型管理</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/analysis">
          <el-icon><TrendCharts /></el-icon>
          <template #title>数据分析</template>
        </el-menu-item>

        <el-menu-item index="/reports">
          <el-icon><Document /></el-icon>
          <template #title>报表管理</template>
        </el-menu-item>

        <el-sub-menu index="system" v-if="isAdmin">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/system/account">账户管理</el-menu-item>
          <el-menu-item index="/system/logs">操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            @click="toggleCollapse"
            :class="{ 'is-collapse': isCollapse }"
          >
            <Fold v-if="isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
              {{ item }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" :src="userAvatar" />
              <span class="username">{{ username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialog" title="修改密码" width="400px">
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="passwordDialog = false">取消</el-button>
          <el-button type="primary" @click="handlePasswordChange">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Monitor,
  User,
  List,
  TrendCharts,
  Document,
  Setting,
  Fold,
  Expand,
  School
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)
const passwordDialog = ref(false)
const passwordFormRef = ref(null)

const isAdmin = computed(() => {
  return userStore.isAdmin
})

const username = computed(() => {
  return userStore.username || '用户'
})

const userAvatar = computed(() => {
  return localStorage.getItem('avatar') || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
})

const activeMenu = computed(() => {
  return route.path
})

const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(Boolean)
  return ['首页', ...paths.map(path => {
    switch (path) {
      case 'dashboard': return '首页'
      case 'students': return '学生列表'
      case 'student-import': return '学生导入'
      case 'behaviors': return '行为记录管理'
      case 'behavior-types': return '行为类型管理'
      case 'analysis': return '数据分析'
      case 'reports': return '报表管理'
      case 'system': return '系统设置'
      case 'account': return '账户管理'
      case 'logs': return '操作日志'
      default: return path
    }
  })]
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleSelect = (index) => {
  router.push(index)
}

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      // 处理个人信息
      break
    case 'password':
      passwordDialog.value = true
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handlePasswordChange = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await request.post('/api/users/change-password', {
          oldPassword: passwordForm.value.oldPassword,
          newPassword: passwordForm.value.newPassword
        })
        ElMessage.success('密码修改成功')
        passwordDialog.value = false
        passwordForm.value = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '密码修改失败')
      }
    }
  })
}

const handleLogout = () => {
  ElMessageBox.confirm('确认退出登录？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      localStorage.removeItem('username')
      router.push('/login')
    })
    .catch(() => {})
}

// 监听路由变化，更新面包屑
watch(
  () => route.path,
  () => {
    // 可以在这里添加其他路由变化时的处理逻辑
  }
)
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
  overflow-x: hidden;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2b2f3a;
  color: #fff;
  font-size: 18px;
  padding: 0 10px;
  overflow: hidden;
  transition: all 0.3s;
}

.logo-icon {
  color: #409EFF;
  margin-right: 10px;
  transition: margin-right 0.3s;
}

.logo.collapsed {
  padding: 0;
  justify-content: center;
}

.logo.collapsed .logo-icon {
  margin-right: 0;
}

.logo span {
  transition: opacity 0.3s;
  white-space: nowrap;
  opacity: 1;
}

.logo.collapsed span {
  opacity: 0;
}

.el-menu-vertical {
  border-right: none;
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.el-menu-vertical:not(.el-menu--collapse) {
  width: 200px;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background-color: #f6f6f6;
  color: #409EFF;
}

.collapse-btn.is-collapse {
  transform: rotate(180deg);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
}

.username {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 添加过渡动画 */
.el-aside {
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.el-menu-vertical {
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
}

/* 优化子菜单样式 */
:deep(.el-sub-menu .el-sub-menu__title) {
  color: #bfcbd9 !important;
}

:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #409EFF !important;
}

:deep(.el-menu-item.is-active) {
  background-color: #263445 !important;
  color: #409EFF !important;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: #263445 !important;
}

/* 图标样式优化 */
:deep(.el-menu-item .el-icon),
:deep(.el-sub-menu .el-icon) {
  width: 24px;
  text-align: center;
  font-size: 18px;
  margin-right: 5px;
}

/* 折叠时的图标居中 */
.el-menu--collapse :deep(.el-menu-item),
.el-menu--collapse :deep(.el-sub-menu .el-sub-menu__title) {
  text-align: center;
}

.el-menu--collapse :deep(.el-menu-item .el-icon),
.el-menu--collapse :deep(.el-sub-menu .el-sub-menu__title .el-icon) {
  margin: 0;
  width: 24px;
  text-align: center;
}

/* 主内容区域过渡 */
.el-main {
  transition: padding 0.3s;
  background-color: #f0f2f5;
}

/* 面包屑过渡 */
.el-breadcrumb {
  transition: opacity 0.3s;
}

/* 用户信息过渡 */
.user-info {
  transition: all 0.3s;
}
</style> 