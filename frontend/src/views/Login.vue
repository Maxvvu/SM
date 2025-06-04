<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-header">
        <el-icon class="logo-icon" :size="48">
          <School />
        </el-icon>
        <h1>学生行为管理系统</h1>
        <p class="subtitle">专业的学生行为跟踪与分析平台</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            :prefix-icon="User"
            placeholder="请输入用户名"
            size="large"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
          />
        </el-form-item>

        <div class="form-footer">
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          <el-link type="primary" underline="never" @click="handleForgotPassword">忘记密码？</el-link>
        </div>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="login-button"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p class="browser-tip">
          <el-icon><ChromeFilled /></el-icon>

        </p>
        <p class="copyright">
          © {{ new Date().getFullYear() }} 制作者：武晓玥
        </p>
      </div>
    </div>

    <!-- 装饰性背景元素 -->
    <div class="decoration-container">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, School, ChromeFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const loginFormRef = ref(null)
const rememberMe = ref(false)
const loginForm = ref({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度不能小于3个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    const success = await userStore.login(loginForm.value.username, loginForm.value.password)
    
    if (success) {
      ElMessage.success('登录成功')
      const redirectPath = route.query.redirect || '/dashboard'
      router.push(redirectPath)
    }
  } catch (error) {
    console.error('登录失败:', error)
    
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          ElMessage.error(data.message || '请检查输入是否正确')
          break
        case 401:
          ElMessage.error(data.message || '用户名或密码错误')
          break
        case 500:
          ElMessage.error(data.message || '服务器错误，请稍后重试')
          break
        default:
          ElMessage.error(data.message || '登录失败，请重试')
      }
    } else if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('登录失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

const handleForgotPassword = () => {
  ElMessageBox.alert('请联系管理员重置密码', '忘记密码', {
    confirmButtonText: '确定',
    type: 'info',
    center: true
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
  overflow: hidden;
}

.login-content {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  width: 420px;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.6s ease-out;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  color: var(--el-color-primary);
  margin-bottom: 16px;
}

h1 {
  font-size: 24px;
  color: var(--el-text-color-primary);
  margin: 0 0 8px;
  font-weight: 600;
}

.subtitle {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin: 0;
}

.login-form {
  margin-top: 30px;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 8px;
}

.login-footer {
  text-align: center;
  margin-top: 30px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.browser-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 6px 0;
}

.browser-tip .el-icon {
  font-size: 14px;
  color: #4285f4;
}

.copyright {
  margin: 6px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 装饰性背景元素 */
.decoration-container {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  opacity: 0.1;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  animation: float 8s infinite ease-in-out;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
  animation: float 6s infinite ease-in-out reverse;
}

.circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  right: 15%;
  animation: float 7s infinite ease-in-out;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-content {
    width: 90%;
    padding: 30px 20px;
  }

  h1 {
    font-size: 20px;
  }

  .logo-icon {
    font-size: 40px;
  }
}

/* Element Plus 组件样式优化 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  height: 44px;
  padding: 0 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.el-input__inner) {
  height: 44px;
}

:deep(.el-form-item__error) {
  padding-top: 4px;
}

:deep(.el-checkbox__label) {
  color: var(--el-text-color-regular);
}
</style> 