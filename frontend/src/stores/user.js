import { defineStore } from 'pinia'
import api from '../api'
import router from '../router'

// 安全的JSON解析函数
const safeJSONParse = (str, defaultValue = null) => {
  if (!str) return defaultValue
  try {
    return JSON.parse(str)
  } catch (e) {
    console.warn('JSON解析失败:', e)
    return defaultValue
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: safeJSONParse(localStorage.getItem('userInfo')),
    userRole: localStorage.getItem('userRole') || ''
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.userInfo?.username,
    isAdmin: (state) => state.userRole === 'admin'
  },

  actions: {
    async login(username, password) {
      try {
        console.log('开始登录请求:', { username })    
        const response = await api.post('/api/auth/login', {
          username,
          password
        })
        
        console.log('登录响应:', response)
        
        if (!response || !response.token || !response.userInfo) {
          throw new Error('服务器响应格式错误')
        }
        
        const { token, userInfo } = response
        
        this.token = token
        this.userInfo = userInfo
        this.userRole = userInfo.role

        localStorage.setItem('token', token)
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
        localStorage.setItem('userRole', userInfo.role)
        
        return true
      } catch (error) {
        console.error('登录失败:', error)
        
        this.token = ''
        this.userInfo = null
        this.userRole = ''
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        localStorage.removeItem('userRole')
        
        // 重新抛出错误，让组件处理具体的错误信息显示
        throw error
      }
    },

    async verifyToken() {
      try {
        const { valid, userInfo } = await api.get('/api/verify-token')
        if (valid) {
          this.userInfo = userInfo
          this.userRole = userInfo.role
          localStorage.setItem('userInfo', JSON.stringify(userInfo))
          localStorage.setItem('userRole', userInfo.role)
          return true
        }
        this.logout()
        return false
      } catch (error) {
        console.error('Token verification failed:', error)
        this.logout()
        return false
      }
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.userRole = ''
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('userRole')
      router.push('/login')
    }
  }
}) 