<template>
  <div class="reports-container">
    <div class="header">
      <h2>统计报表</h2>
      <div class="header-right">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="handleDateChange"
        />
        <el-select v-model="selectedGrade" placeholder="选择年级" clearable @change="handleFilter" style="margin-left: 10px">
          <el-option label="高一" value="高一" />
          <el-option label="高二" value="高二" />
          <el-option label="高三" value="高三" />
        </el-select>
        <el-button type="primary" @click="exportReport" style="margin-left: 10px">
          <el-icon><Download /></el-icon>
          导出报表
        </el-button>
      </div>
    </div>

    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span>违纪详细信息</span>
        </div>
      </template>
      <el-table
        :data="detailData"
        style="width: 100%"
        v-loading="loading"
        border
        stripe
        :empty-text="loading ? '加载中...' : '暂无数据'"
      >
        <el-table-column prop="student_name" label="学生姓名" width="120" />
        <el-table-column prop="teacher" label="班主任" width="120" />
        <el-table-column prop="behavior_type" label="违纪类型" width="150" />
        <el-table-column prop="behavior_score" label="扣分" width="100">
          <template #default="scope">
            <span :class="{ 'negative-score': scope.row.behavior_score < 0, 'positive-score': scope.row.behavior_score > 0 }">
              {{ scope.row.behavior_score >= 0 ? '+' : '' }}{{ scope.row.behavior_score }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="违纪时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="class" label="班级" width="100" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
      </el-table>
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import axios from 'axios'
import * as XLSX from 'xlsx'

const dateRange = ref([])
const selectedGrade = ref('')
const loading = ref(false)

// 添加详细信息相关的响应式变量
const allData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const detailData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return allData.value.slice(start, end)
})

onMounted(() => {
  console.log('开始获取数据')
  fetchData()
})

const fetchData = async () => {
  try {
    loading.value = true
    console.log('获取统计数据，参数:', {
      grade: selectedGrade.value,
      start_date: dateRange.value?.[0]?.toISOString(),
      end_date: dateRange.value?.[1]?.toISOString()
    })

    // 获取违纪详细数据
    console.log('获取违纪详细数据，参数:', {
      grade: selectedGrade.value,
      category: '违纪',
      start_date: dateRange.value?.[0]?.toISOString(),
      end_date: dateRange.value?.[1]?.toISOString()
    })

    // 获取学生数据（包含班主任信息）
    const [behaviorsResponse, studentsResponse] = await Promise.all([
      axios.get('/api/behaviors', {
        params: {
          grade: selectedGrade.value,
          start_date: dateRange.value?.[0]?.toISOString(),
          end_date: dateRange.value?.[1]?.toISOString()
        }
      }),
      axios.get('/api/students')
    ])

    const students = studentsResponse.data
    const behaviors = behaviorsResponse.data

    // 将班主任信息添加到行为记录中
    allData.value = behaviors.map(behavior => {
      const student = students.find(s => s.name === behavior.student_name)
      return {
        ...behavior,
        teacher: student?.teacher || '未分配'
      }
    })

    total.value = allData.value.length
    console.log('更新后的详细数据总数:', total.value)

  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleDateChange = () => {
  fetchData()
}

const handleFilter = () => {
  fetchData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const exportReport = () => {
  // 准备导出数据
  const exportData = allData.value.map(item => ({
    '学生姓名': item.student_name,
    '班主任': item.teacher,
    '违纪类型': item.behavior_type,
    '扣分': item.behavior_score,
    '违纪时间': formatDate(item.date),
    '年级': item.grade,
    '班级': item.class,
    '描述': item.description
  }))

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '违纪记录')

  // 导出文件
  XLSX.writeFile(wb, '违纪记录报表.xlsx')
}
</script>

<style scoped>
.reports-container {
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

.detail-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.negative-score {
  color: #f56c6c;
  font-weight: 600;
}

.positive-score {
  color: #67c23a;
  font-weight: 600;
}
</style> 