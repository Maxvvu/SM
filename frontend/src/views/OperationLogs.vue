<template>
  <div class="operation-logs">
    <div class="header">
      <h2>操作日志</h2>
      <div class="header-right">
        <el-select v-model="operationType" placeholder="操作类型" clearable @change="handleSearch" style="margin-right: 10px">
          <el-option label="登录" value="login" />
          <el-option label="添加" value="create" />
          <el-option label="修改" value="update" />
          <el-option label="删除" value="delete" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="shortcuts"
          @change="handleDateChange"
          style="margin-right: 10px"
        />
        <el-button type="danger" :disabled="!selectedLogs.length" @click="handleBatchDelete">
          批量删除
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="logs"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="timestamp" label="时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column prop="type" label="操作类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getOperationTypeTag(row.type)">
            {{ getOperationTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="module" label="模块" width="100" />
      <el-table-column prop="description" label="描述" />
      <el-table-column prop="username" label="操作人" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTag(row.status)">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button
            type="danger"
            size="small"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="删除确认"
      width="30%"
    >
      <span>{{ deleteDialogMessage }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const operationType = ref('')
const dateRange = ref(null)
const selectedLogs = ref([])
const deleteDialogVisible = ref(false)
const deleteDialogMessage = ref('')
const currentDeleteLogs = ref(null)

const shortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    }
  }
]

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getOperationTypeTag = (type) => {
  const tags = {
    login: 'info',
    create: 'success',
    update: 'warning',
    delete: 'danger'
  }
  return tags[type] || 'info'
}

const getOperationTypeLabel = (type) => {
  const labels = {
    login: '登录',
    create: '添加',
    update: '修改',
    delete: '删除'
  }
  return labels[type] || type
}

const getStatusTag = (status) => {
  const tags = {
    success: 'success',
    failure: 'danger',
    error: 'danger'
  }
  return tags[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    success: '成功',
    failure: '失败',
    error: '错误'
  }
  return labels[status] || status
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      type: operationType.value
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }

    const response = await api.get('/api/logs', { params })
    logs.value = response.logs
    total.value = response.total
  } catch (error) {
    console.error('获取操作日志失败:', error)
    ElMessage.error('获取操作日志失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchLogs()
}

const handleDateChange = () => {
  handleSearch()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchLogs()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchLogs()
}

const handleSelectionChange = (selection) => {
  selectedLogs.value = selection
}

const handleDelete = (row) => {
  currentDeleteLogs.value = [row]
  deleteDialogMessage.value = '确定要删除这条日志吗？'
  deleteDialogVisible.value = true
}

const handleBatchDelete = () => {
  if (selectedLogs.value.length === 0) {
    ElMessage.warning('请选择要删除的日志')
    return
  }
  currentDeleteLogs.value = selectedLogs.value
  deleteDialogMessage.value = `确定要删除选中的 ${selectedLogs.value.length} 条日志吗？`
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  try {
    const ids = currentDeleteLogs.value.map(log => log.id)
    const response = await api.delete('/api/logs/batch', { 
      data: { ids },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.message) {
      ElMessage.success(response.message)
      deleteDialogVisible.value = false
      await fetchLogs()
    } else {
      throw new Error('删除失败：服务器响应异常')
    }
  } catch (error) {
    console.error('删除日志失败:', error)
    ElMessage.error(error.response?.data?.message || '删除失败')
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.operation-logs {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-right {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 