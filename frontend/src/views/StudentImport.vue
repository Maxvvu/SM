<template>
  <div class="student-import-container">
    <div class="header">
      <h2>学生导入</h2>
    </div>

    <el-card class="import-card">
      <div class="import-area">
        <el-upload
          class="excel-uploader"
          :action="`/api/students/import`"
          :headers="uploadHeaders"
          :on-success="handleImportSuccess"
          :on-error="handleImportError"
          :before-upload="beforeExcelUpload"
          :data="uploadData"
          name="file"
          accept=".xlsx,.xls"
          :show-file-list="false"
          :disabled="importing"
          :multiple="false"
        >
          <template #trigger>
            <el-button type="primary" :loading="importing">
              <el-icon class="el-icon--upload"><Upload /></el-icon>
              选择Excel文件
            </el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">
              请上传Excel文件（.xlsx或.xls格式，大小不超过5MB）
              <br />
              <span class="tip-warning">注意：请确保Excel文件中的数据格式正确，避免空行或格式错误</span>
            </div>
          </template>
        </el-upload>

        <div class="template-download">
          <h3>导入说明：</h3>
          <ol>
            <li>请下载模板文件，按照模板格式填写学生信息</li>
            <li>必填字段：姓名、学号、年级、班级、班主任</li>
            <li>选填字段：状态、家庭住址、紧急联系人、联系人电话、备注</li>
            <li>年级格式：高一、高二、高三，或"YYYY级"（如"2025级"）</li>
            <li>状态可选值：正常、警告、严重警告、记过、留校察看、勒令退学、开除学籍</li>
            <li>学号不能重复，只能包含字母和数字</li>
            <li>Excel文件大小不能超过5MB</li>
          </ol>
          <el-button type="success" @click="downloadTemplate" :loading="downloading">
            <el-icon><Download /></el-icon>
            下载导入模板
          </el-button>
        </div>
      </div>

      <!-- 导入结果显示 -->
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="'导入完成'"
          :type="importResult.error_count > 0 ? 'warning' : 'success'"
          :description="getResultDescription()"
          show-icon
          :closable="false"
        />
        
        <!-- 错误信息列表 -->
        <div v-if="importResult.error_messages && importResult.error_messages.length > 0" class="error-list">
          <h4>错误详情：</h4>
          <el-collapse>
            <el-collapse-item title="查看详细错误信息">
              <ul>
                <li v-for="(error, index) in importResult.error_messages" :key="index" class="error-item">
                  {{ error }}
                </li>
              </ul>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download } from '@element-plus/icons-vue'
import api from '../api'

const importing = ref(false)
const downloading = ref(false)
const importResult = ref(null)

// 上传请求头和数据
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}))

const uploadData = ref({
  timestamp: Date.now()
})

// 文件上传前的验证
const beforeExcelUpload = (file) => {
  const isExcel = (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                   file.type === 'application/vnd.ms-excel' ||
                   file.name.endsWith('.xlsx') ||
                   file.name.endsWith('.xls'))
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isExcel) {
    ElMessage.error('只能上传Excel文件（.xlsx或.xls格式）!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('文件大小不能超过 5MB!')
    return false
  }

  // 重置导入结果
  importResult.value = null
  importing.value = true
  return true
}

// 导入成功处理
const handleImportSuccess = (response) => {
  importing.value = false
  if (response) {
    importResult.value = {
      success_count: response.success || 0,
      error_count: response.errors?.length || 0,
      error_messages: response.errors || []
    }
    
    if (response.errors?.length > 0) {
      ElMessage.warning({
        message: `导入完成，成功${response.success}条，失败${response.errors.length}条，请查看详细错误信息`,
        duration: 5000
      })
    } else {
      ElMessage.success(`成功导入${response.success}条数据`)
    }
  }
}

// 导入失败处理
const handleImportError = (error) => {
  importing.value = false
  console.error('导入失败:', error.response || error)
  
  let errorMessage = '导入失败'
  let errorDetails = []
  
  if (error.response?.data) {
    const responseData = error.response.data
    
    // 处理不同格式的错误响应
    if (typeof responseData === 'string') {
      errorMessage = responseData
    } else if (responseData.message) {
      errorMessage = responseData.message
      if (responseData.errors) {
        errorDetails = Array.isArray(responseData.errors) ? responseData.errors : [responseData.errors]
      }
    } else if (responseData.errors) {
      errorDetails = Array.isArray(responseData.errors) ? responseData.errors : [responseData.errors]
      errorMessage = '导入数据有误，请检查后重试'
    }
  }
  
  // 更新导入结果以显示错误信息
  importResult.value = {
    success_count: 0,
    error_count: errorDetails.length || 1,
    error_messages: errorDetails.length ? errorDetails : [errorMessage]
  }
  
  // 显示错误消息
  ElMessage.error({
    message: errorMessage,
    duration: 5000
  })
}

// 获取导入结果描述
const getResultDescription = () => {
  if (!importResult.value) return ''
  
  const { success_count, error_count } = importResult.value
  const total = success_count + error_count
  
  return `共处理 ${total} 条记录，成功导入 ${success_count} 条，失败 ${error_count} 条`
}

// 下载模板文件
const downloadTemplate = async () => {
  if (downloading.value) return
  
  try {
    downloading.value = true
    const response = await api.get('/students/template', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    })

    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = '学生导入模板.xlsx'
    document.body.appendChild(link)
    link.click()
    
    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('模板下载失败:', error)
    ElMessage.error('模板下载失败，请重试')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.student-import-container {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.import-card {
  max-width: 800px;
  margin: 0 auto;
}

.import-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background-color: #fafafa;
  text-align: center;
}

.excel-uploader {
  margin-bottom: 20px;
}

.template-download {
  width: 100%;
  text-align: left;
  margin-top: 20px;
}

.template-download h3 {
  margin-bottom: 10px;
  color: #606266;
}

.template-download ol {
  margin-bottom: 20px;
  padding-left: 20px;
  color: #606266;
}

.template-download li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.import-result {
  margin-top: 20px;
}

.error-list {
  margin-top: 20px;
  background-color: #fef0f0;
  padding: 15px;
  border-radius: 4px;
}

.error-list h4 {
  color: #f56c6c;
  margin-bottom: 10px;
  font-weight: 600;
}

.error-item {
  color: #f56c6c;
  margin-bottom: 8px;
  line-height: 1.5;
  font-size: 13px;
  list-style-type: disc;
  margin-left: 16px;
}

:deep(.el-collapse) {
  border: none;
  background: transparent;
}

:deep(.el-collapse-item__header) {
  background-color: transparent;
  color: #f56c6c;
  font-size: 13px;
  border-bottom: none;
}

:deep(.el-collapse-item__content) {
  padding: 10px 0;
  background-color: transparent;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.tip-warning {
  color: #e6a23c;
  font-size: 12px;
  margin-top: 4px;
  display: inline-block;
}
</style> 