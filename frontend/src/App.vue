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

/* 暗色主题样式 */
.dark {
  --el-bg-color: #1f1f1f;
  --el-bg-color-overlay: #2d2d2d;
  --el-text-color-primary: #ffffff;
  --el-text-color-regular: #e5e5e5;
  --el-text-color-secondary: #a3a6ad;
  --el-border-color: #434343;
  --el-border-color-light: #434343;
  --el-border-color-lighter: #434343;
  --el-fill-color-blank: #2d2d2d;
  --el-mask-color: rgba(0, 0, 0, 0.8);
  --el-mask-color-extra-light: rgba(0, 0, 0, 0.3);
  color-scheme: dark;
}

.dark .el-card {
  --el-card-bg-color: #2d2d2d;
  border-color: #434343;
}

.dark .el-table {
  --el-table-bg-color: #2d2d2d;
  --el-table-tr-bg-color: #2d2d2d;
  --el-table-header-bg-color: #1f1f1f;
  --el-table-border-color: #434343;
}

.dark .el-input__wrapper {
  background-color: #1f1f1f;
}

.dark .el-select__wrapper {
  background-color: #1f1f1f;
}

.dark .el-menu {
  --el-menu-bg-color: #2d2d2d;
  --el-menu-hover-bg-color: #1f1f1f;
  border-right-color: #434343;
}

.dark .el-menu-item:not(.is-active):hover {
  background-color: #1f1f1f;
}

.dark .el-sub-menu__title:hover {
  background-color: #1f1f1f;
}

/* 对话框暗色主题 */
.dark .el-dialog {
  background-color: #2d2d2d;
}

.dark .el-dialog__header {
  color: #ffffff;
}

/* 下拉菜单暗色主题 */
.dark .el-dropdown-menu {
  background-color: #2d2d2d;
  border-color: #434343;
}

.dark .el-dropdown-menu__item {
  color: #e5e5e5;
}

.dark .el-dropdown-menu__item:hover {
  background-color: #1f1f1f;
}

.dark .el-dropdown-menu__item--divided:before {
  background-color: #434343;
}

/* 分页器暗色主题 */
.dark .el-pagination {
  --el-pagination-bg-color: #2d2d2d;
  --el-pagination-hover-color: #409EFF;
}

.dark .el-pagination button {
  background-color: #2d2d2d;
  color: #e5e5e5;
}

.dark .el-pagination .el-select .el-input .el-input__wrapper {
  background-color: #1f1f1f;
}

/* 表单暗色主题 */
.dark .el-form-item__label {
  color: #e5e5e5;
}

/* 按钮暗色主题 */
.dark .el-button {
  --el-button-bg-color: #2d2d2d;
  --el-button-border-color: #434343;
  --el-button-hover-bg-color: #1f1f1f;
  --el-button-hover-border-color: #409EFF;
}

.dark .el-button--default {
  --el-button-text-color: #e5e5e5;
}

/* 标签暗色主题 */
.dark .el-tag {
  border-color: #434343;
}

/* 面包屑暗色主题 */
.dark .el-breadcrumb__item {
  color: #a3a6ad;
}

.dark .el-breadcrumb__item:last-child .el-breadcrumb__inner {
  color: #e5e5e5;
}

/* 开关暗色主题 */
.dark .el-switch {
  --el-switch-off-color: #1f1f1f;
}

/* 头像暗色主题 */
.dark .el-avatar {
  --el-avatar-bg-color: #1f1f1f;
  border: 1px solid #434343;
}

/* 上传组件暗色主题 */
.dark .el-upload {
  --el-upload-border-color: #434343;
  --el-upload-bg-color: #1f1f1f;
}

.dark .el-upload:hover {
  border-color: #409EFF;
}

/* 消息提示暗色主题 */
.dark .el-message {
  background-color: #2d2d2d;
  border-color: #434343;
}

.dark .el-message--success {
  --el-message-bg-color: #2d2d2d;
  border-color: #67c23a;
}

.dark .el-message--error {
  --el-message-bg-color: #2d2d2d;
  border-color: #f56c6c;
}

.dark .el-message--warning {
  --el-message-bg-color: #2d2d2d;
  border-color: #e6a23c;
}

/* 确认框暗色主题 */
.dark .el-message-box {
  background-color: #2d2d2d;
  border-color: #434343;
}

.dark .el-message-box__title {
  color: #e5e5e5;
}

.dark .el-message-box__content {
  color: #e5e5e5;
}

/* 日期选择器暗色主题 */
.dark .el-date-picker {
  --el-datepicker-bg-color: #2d2d2d;
  --el-datepicker-border-color: #434343;
  --el-datepicker-text-color: #e5e5e5;
  --el-datepicker-off-text-color: #a3a6ad;
}

/* 选择器暗色主题 */
.dark .el-select-dropdown {
  background-color: #2d2d2d;
  border-color: #434343;
}

.dark .el-select-dropdown__item {
  color: #e5e5e5;
}

.dark .el-select-dropdown__item.hover,
.dark .el-select-dropdown__item:hover {
  background-color: #1f1f1f;
}

/* 滚动条暗色主题 */
.dark ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: #434343;
  border-radius: 3px;
}

.dark ::-webkit-scrollbar-track {
  background-color: #1f1f1f;
}

/* 主布局暗色主题 */
.dark .layout-container {
  background-color: #1f1f1f;
}

.dark .aside {
  background-color: #2d2d2d;
  border-right: 1px solid #434343;
}

.dark .header {
  background-color: #2d2d2d;
  border-bottom: 1px solid #434343;
}

.dark .el-main {
  background-color: #1f1f1f;
}

/* 亮色主题样式 */
.light {
  --el-bg-color: #ffffff;
  --el-bg-color-overlay: #ffffff;
  --el-text-color-primary: #303133;
  --el-text-color-regular: #606266;
  --el-text-color-secondary: #909399;
  --el-border-color: #dcdfe6;
  --el-border-color-light: #e4e7ed;
  --el-border-color-lighter: #ebeef5;
  --el-fill-color-blank: #ffffff;
  --el-mask-color: rgba(255, 255, 255, 0.9);
  --el-mask-color-extra-light: rgba(255, 255, 255, 0.3);
  color-scheme: light;
}
</style>
