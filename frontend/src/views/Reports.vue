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

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>行为类型分布</span>
            </div>
          </template>
          <div ref="behaviorTypeChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>年级行为对比</span>
            </div>
          </template>
          <div ref="gradeComparisonChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

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
        <el-table-column prop="behavior_type" label="违纪类型" width="150" />
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
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import axios from 'axios'
import * as XLSX from 'xlsx'

const dateRange = ref([])
const selectedGrade = ref('')
const loading = ref(false)
const behaviorTypeChartRef = ref(null)
const gradeComparisonChartRef = ref(null)

let behaviorTypeChart = null
let gradeComparisonChart = null

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
  console.log('组件挂载，初始化图表')
  initCharts()
  console.log('开始获取数据')
  fetchData()
})

const initCharts = () => {
  // 初始化行为类型分布图表
  behaviorTypeChart = echarts.init(behaviorTypeChartRef.value)
  behaviorTypeChart.setOption({
    title: {
      text: '行为类型分布'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: []
      }
    ]
  })

  // 初始化年级行为对比图表
  gradeComparisonChart = echarts.init(gradeComparisonChartRef.value)
  gradeComparisonChart.setOption({
    title: {
      text: '年级行为对比'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['违纪', '优秀']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['高一', '高二', '高三']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '违纪',
        type: 'bar',
        stack: 'total',
        label: {
          show: true
        },
        emphasis: {
          focus: 'series'
        },
        data: []
      },
      {
        name: '优秀',
        type: 'bar',
        stack: 'total',
        label: {
          show: true
        },
        emphasis: {
          focus: 'series'
        },
        data: []
      }
    ]
  })

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    behaviorTypeChart.resize()
    gradeComparisonChart.resize()
  })
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      grade: selectedGrade.value,
      start_date: dateRange.value?.[0],
      end_date: dateRange.value?.[1]
    }

    console.log('获取统计数据，参数:', params)
    // 获取统计数据
    const statsResponse = await axios.get('/api/statistics', { params })
    console.log('统计数据响应:', statsResponse.data)
    const statsData = statsResponse.data

    // 更新图表数据
    updateCharts(statsData)

    // 获取违纪详细数据
    const detailParams = {
      grade: selectedGrade.value,
      category: '违纪',
      start_date: dateRange.value?.[0]?.toISOString().split('T')[0],
      end_date: dateRange.value?.[1]?.toISOString().split('T')[0]
    }

    console.log('获取违纪详细数据，参数:', detailParams)
    const detailResponse = await axios.get('/api/behaviors', { params: detailParams })
    console.log('违纪详细数据响应:', detailResponse.data)

    if (Array.isArray(detailResponse.data)) {
      allData.value = detailResponse.data
      total.value = detailResponse.data.length
      console.log('更新后的详细数据总数:', total.value)
    } else {
      console.warn('未获取到有效的违纪详细数据')
      allData.value = []
      total.value = 0
    }

  } catch (error) {
    console.error('获取数据失败:', error.response || error)
    ElMessage.error(error.response?.data?.message || '获取数据失败')
    allData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const updateCharts = (data) => {
  // 更新行为类型分布图表
  if (data.behavior_type_distribution) {
    behaviorTypeChart.setOption({
      series: [{
        data: data.behavior_type_distribution
      }]
    })
  }

  // 更新年级行为对比图表
  if (data.grade_violations && data.grade_excellent) {
    gradeComparisonChart.setOption({
      series: [
        {
          data: data.grade_violations
        },
        {
          data: data.grade_excellent
        }
      ]
    })
  }
}

const handleDateChange = () => {
  currentPage.value = 1 // 重置页码
  fetchData()
}

const handleFilter = () => {
  currentPage.value = 1 // 重置页码
  fetchData()
}

const exportReport = async () => {
  try {
    loading.value = true
    
    // 准备导出参数
    const params = {
      grade: selectedGrade.value,
      start_date: dateRange.value?.[0]?.toISOString().split('T')[0],
      end_date: dateRange.value?.[1]?.toISOString().split('T')[0]
    }
    
    // 获取所有行为记录
    const response = await axios.get('/api/behaviors', { params })
    const data = response.data
    
    if (!data || !data.length) {
      ElMessage.warning('没有数据可供导出')
      return
    }
    
    // 准备Excel数据
    const excelData = data.map(item => ({
      '学生姓名': item.student_name,
      '年级': item.grade,
      '班级': item.class,
      '行为类型': item.behavior_type,
      '行为类别': item.category,
      '描述': item.description,
      '时间': formatDate(item.date)
    }))
    
    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 学生姓名
      { wch: 8 },  // 年级
      { wch: 8 },  // 班级
      { wch: 15 }, // 行为类型
      { wch: 8 },  // 行为类别
      { wch: 40 }, // 描述
      { wch: 20 }  // 时间
    ]
    ws['!cols'] = colWidths
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '行为记录报表')
    
    // 生成文件名
    const dateStr = new Date().toISOString().split('T')[0]
    const fileName = `行为记录报表_${dateStr}.xlsx`
    
    // 导出文件
    XLSX.writeFile(wb, fileName)
    
    ElMessage.success('报表导出成功')
  } catch (error) {
    console.error('导出报表失败:', error)
    ElMessage.error('导出报表失败')
  } finally {
    loading.value = false
  }
}

// 分页处理方法
const handleSizeChange = (val) => {
  pageSize.value = val
  // 不需要重新请求数据，因为是前端分页
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  // 不需要重新请求数据，因为是前端分页
}

// 日期格式化方法
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听筛选条件变化
watch([dateRange, selectedGrade], () => {
  currentPage.value = 1 // 重置页码
  fetchData()
}, { deep: true })
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

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-card {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.el-table {
  margin-top: 10px;
}
</style> 