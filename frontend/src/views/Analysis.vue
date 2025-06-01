<template>
  <div class="analysis-container">
    <div class="header">
      <h2>统计分析</h2>
      <div class="header-right">
        <el-select v-model="filterGrade" placeholder="选择年级" clearable @change="fetchData" style="margin-right: 10px">
          <el-option label="高一" value="高一" />
          <el-option label="高二" value="高二" />
          <el-option label="高三" value="高三" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          @change="fetchData"
        />
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <span>总违纪次数</span>
            </div>
          </template>
          <div class="stat-number violation">
            {{ statistics.totalViolations }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <span>总优秀表现</span>
            </div>
          </template>
          <div class="stat-number excellent">
            {{ statistics.totalExcellent }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <span>违纪学生数</span>
            </div>
          </template>
          <div class="stat-number">
            {{ statistics.violationStudents }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <span>违纪率</span>
            </div>
          </template>
          <div class="stat-number warning">
            {{ statistics.violationRate }}%
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>年级违纪率对比</span>
            </div>
          </template>
          <div class="chart-container">
            <div ref="gradeViolationChart" style="width: 100%; height: 300px"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>违纪率趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <div ref="violationTrendChart" style="width: 100%; height: 300px"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>行为记录趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <div ref="trendChart" style="width: 100%; height: 300px"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const filterGrade = ref('')
const dateRange = ref('')
const loading = ref(false)

// 图表实例
const gradeViolationChart = ref(null)
const violationTrendChart = ref(null)
const trendChart = ref(null)
let charts = []

// 统计数据
const statistics = ref({
  totalViolations: 0,
  totalExcellent: 0,
  violationStudents: 0,
  excellentStudents: 0,
  violationRate: 0
})

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  }
]

// 初始化图表
const initCharts = () => {
  // 年级违纪率图表
  const gradeViolationChartInstance = echarts.init(gradeViolationChart.value)
  gradeViolationChartInstance.setOption({
    title: {
      text: '年级违纪率对比',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{b}: {c}%'
    },
    xAxis: {
      type: 'category',
      data: ['高一', '高二', '高三'],
      axisLabel: {
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '违纪率',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      data: [],
      type: 'bar',
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%'
      }
    }]
  })

  // 违纪率趋势图表
  const violationTrendChartInstance = echarts.init(violationTrendChart.value)
  violationTrendChartInstance.setOption({
    title: {
      text: '违纪率趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}%'
    },
    xAxis: {
      type: 'category',
      data: [],
      axisLabel: {
        interval: 0,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '违纪率',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      data: [],
      type: 'line',
      smooth: true,
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%'
      },
      itemStyle: {
        color: '#f56c6c'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: 'rgba(245, 108, 108, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(245, 108, 108, 0.1)'
          }]
        }
      }
    }]
  })

  // 行为记录趋势图表
  const timeChart = echarts.init(trendChart.value)
  timeChart.setOption({
    title: {
      text: '行为记录趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['违纪', '优秀'],
      top: 30
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLabel: {
        formatter: '{MM}月'
      }
    },
    yAxis: {
      type: 'value',
      name: '人数'
    },
    series: [
      {
        name: '违纪',
        type: 'line',
        data: [],
        itemStyle: {
          color: '#f56c6c'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(245, 108, 108, 0.3)'
            }, {
              offset: 1,
              color: 'rgba(245, 108, 108, 0.1)'
            }]
          }
        }
      },
      {
        name: '优秀',
        type: 'line',
        data: [],
        itemStyle: {
          color: '#67c23a'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(103, 194, 58, 0.3)'
            }, {
              offset: 1,
              color: 'rgba(103, 194, 58, 0.1)'
            }]
          }
        }
      }
    ]
  })

  charts = [gradeViolationChartInstance, violationTrendChartInstance, timeChart]
}

// 获取统计数据
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      grade: filterGrade.value || '',
      start_date: dateRange.value?.[0]?.toISOString().split('T')[0] || '',
      end_date: dateRange.value?.[1]?.toISOString().split('T')[0] || ''
    }
    
    const response = await axios.get('/api/statistics/analysis', { params })
    const data = response.data

    // 更新统计数字
    statistics.value = {
      totalViolations: data.totalViolationStudents || 0,
      totalExcellent: data.totalStudents - (data.totalViolationStudents || 0),
      violationStudents: data.totalViolationStudents || 0,
      excellentStudents: data.totalStudents - (data.totalViolationStudents || 0),
      violationRate: data.totalViolationRate || 0
    }

    // 更新年级违纪率图表
    const gradeData = data.gradeViolationRates.filter(item => 
      ['高一', '高二', '高三'].includes(item.grade)
    ).map(item => ({
      value: item.violation_rate,
      itemStyle: {
        color: getGradeColor(item.violation_rate)
      }
    }))

    charts[0].setOption({
      series: [{
        data: gradeData
      }]
    })

    // 更新违纪率趋势图表
    const monthlyTrends = data.monthlyTrends || []
    charts[1].setOption({
      xAxis: {
        data: monthlyTrends.map(item => item.month)
      },
      series: [{
        data: monthlyTrends.map(item => item.violation_rate)
      }]
    })

    // 更新行为记录趋势图
    const trendData = monthlyTrends.map(item => ({
      date: item.month,
      violations: item.violation_students,
      excellent: item.total_students - item.violation_students
    }))

    charts[2].setOption({
      series: [
        {
          data: trendData.map(item => [item.date, item.violations])
        },
        {
          data: trendData.map(item => [item.date, item.excellent])
        }
      ]
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
  } finally {
    loading.value = false
  }
}

// 根据违纪率获取颜色
const getGradeColor = (rate) => {
  if (rate >= 30) return '#f56c6c' // 红色
  if (rate >= 20) return '#e6a23c' // 橙色
  return '#67c23a' // 绿色
}

// 监听窗口大小变化
const handleResize = () => {
  charts.forEach(chart => chart?.resize())
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(chart => chart?.dispose())
})
</script>

<style scoped>
.analysis-container {
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
  gap: 10px;
}

.stat-card {
  height: 160px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-number {
  font-size: 36px;
  font-weight: bold;
  text-align: center;
  margin-top: 20px;
}

.stat-number.violation {
  color: #f56c6c;
}

.stat-number.excellent {
  color: #67c23a;
}

.stat-number.warning {
  color: #e6a23c;
}

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 