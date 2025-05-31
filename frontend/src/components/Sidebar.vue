<template>
  <el-menu
    :default-active="route.path"
    class="sidebar-menu"
    router
    :collapse="isCollapse"
  >
    <el-menu-item index="/dashboard">
      <el-icon><House /></el-icon>
      <span>首页</span>
    </el-menu-item>
    
    <el-menu-item index="/students">
      <el-icon><User /></el-icon>
      <span>学生管理</span>
    </el-menu-item>
    
    <el-menu-item index="/student-import">
      <el-icon><Upload /></el-icon>
      <span>学生导入</span>
    </el-menu-item>
    
    <el-menu-item index="/behaviors">
      <el-icon><List /></el-icon>
      <span>行为记录</span>
    </el-menu-item>
    
    <el-menu-item index="/behavior-types">
      <el-icon><Setting /></el-icon>
      <span>行为类型</span>
    </el-menu-item>
    
    <el-menu-item index="/analysis">
      <el-icon><DataLine /></el-icon>
      <span>数据分析</span>
    </el-menu-item>
    
    <el-menu-item index="/reports">
      <el-icon><Document /></el-icon>
      <span>报表管理</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  House,
  User,
  Upload,
  List,
  Setting,
  DataLine,
  Document
} from '@element-plus/icons-vue'

const route = useRoute()
const isCollapse = ref(false)
</script>

<style scoped>
.sidebar-menu {
  height: 100%;
  border-right: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 200px;
}
</style> 