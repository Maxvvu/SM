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
        <el-table-column prop="process_result" label="处理结果" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-if="scope.row.process_result" type="info" effect="plain">
              {{ scope.row.process_result }}
            </el-tag>
            <span v-else class="no-result">未处理</span>
          </template>
        </el-table-column>
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
import moment from 'moment'

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
    
    // 获取行为记录和学生数据
    const [behaviorsResponse, studentsResponse] = await Promise.all([
      axios.get('/api/behaviors', {
        params: {
          grade: selectedGrade.value,
          start_date: dateRange.value?.[0]?.toISOString().split('T')[0],
          end_date: dateRange.value?.[1]?.toISOString().split('T')[0]
        }
      }),
      axios.get('/api/students')
    ])

    const students = studentsResponse.data
    const behaviors = behaviorsResponse.data

    // 将班主任信息和分数信息添加到行为记录中
    allData.value = behaviors.map(behavior => {
      const student = students.find(s => s.name === behavior.student_name)
      return {
        ...behavior,
        teacher: student?.teacher || '未分配',
        behavior_score: behavior.behavior_score || 0,
        behavior_category: behavior.behavior_category || '未分类'
      }
    })

    total.value = allData.value.length

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
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
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
    '描述': item.description,
    '处理结果': item.process_result || '未处理',
    '行为类别': item.behavior_category
  }))

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // 设置列宽
  const colWidths = [
    { wch: 10 }, // 学生姓名
    { wch: 10 }, // 班主任
    { wch: 15 }, // 违纪类型
    { wch: 8 },  // 扣分
    { wch: 20 }, // 违纪时间
    { wch: 8 },  // 年级
    { wch: 8 },  // 班级
    { wch: 30 }, // 描述
    { wch: 15 }, // 处理结果
    { wch: 10 }  // 行为类别
  ]
  ws['!cols'] = colWidths

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '行为记录')

  // 生成文件名（包含日期范围）
  const startDate = dateRange.value?.[0] ? moment(dateRange.value[0]).format('YYYY-MM-DD') : '全部'
  const endDate = dateRange.value?.[1] ? moment(dateRange.value[1]).format('YYYY-MM-DD') : '全部'
  const fileName = `行为记录报表_${startDate}_${endDate}.xlsx`

  // 导出文件
  XLSX.writeFile(wb, fileName)
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

.no-result {
  color: #909399;
  font-weight: 400;
}
</style> 