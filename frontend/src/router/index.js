import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layout/MainLayout.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'students',
        name: 'Students',
        component: () => import('../views/Students.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'student-import',
        name: 'StudentImport',
        component: () => import('../views/StudentImport.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'behaviors',
        name: 'Behaviors',
        component: () => import('../views/Behaviors.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'behavior-types',
        name: 'BehaviorTypes',
        component: () => import('../views/BehaviorTypes.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'analysis',
        name: 'Analysis',
        component: () => import('../views/Analysis.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/Reports.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'system',
        name: 'System',
        meta: { requiresAuth: true },
        children: [
          {
            path: 'account',
            name: 'AccountManagement',
            component: () => import('../views/AccountManagement.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
          },
          {
            path: 'logs',
            name: 'OperationLogs',
            component: () => import('../views/OperationLogs.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
          }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    } else if (to.matched.some(record => record.meta.requiresAdmin) && userRole !== 'admin') {
      next('/dashboard')
    } else {
      next()
    }
  } else {
    if (token && to.path === '/login') {
      next('/dashboard')
    } else {
      next()
    }
  }
})

export default router 