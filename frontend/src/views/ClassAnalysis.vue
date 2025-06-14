<template>
  <div class="class-analysis-container">
    <div class="header">
      <h2>班级违纪分析</h2>
      <div class="filters">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          @change="handleDateChange"
        />
        <el-select v-model="selectedGrade" placeholder="选择年级" clearable @change="handleGradeChange">
          <el-option label="全部年级" value="" />
          <el-option label="高一" value="高一" />
          <el-option label="高二" value="高二" />
          <el-option label="高三" value="高三" />
        </el-select>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="analysis-card">
          <template #header>
            <div class="card-header">
              <span>总体概况</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ analysisData.totalStudents || 0 }}</div>
                <div class="stat-label">学生总数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ analysisData.totalViolationStudents || 0 }}</div>
                <div class="stat-label">违纪学生数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ analysisData.totalViolations || 0 }}</div>
                <div class="stat-label">违纪总次数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ analysisData.totalViolationRate || 0 }}%</div>
                <div class="stat-label">总体违纪率</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>班级违纪率排名</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="classRankingOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>年级违纪情况对比</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="gradeComparisonOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>班级违纪趋势分析</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="trendOption" autoresize />
          </div>
        </el-card>
      </el-col>

    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import api from '../api'
import { ElMessage } from 'element-plus'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const dateRange = ref([])
const selectedGrade = ref('')
const analysisData = ref({})

// 日期快捷选项
const dateShortcuts = [
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
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '最近三月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    }
  }
]

// 班级违纪率排名图表配置
const classRankingOption = computed(() => {
  if (!analysisData.value?.classAnalysis?.rankings?.top_violation_rate) {
    return {}
  }

  const data = analysisData.value.classAnalysis.rankings.top_violation_rate
  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>违纪率: {c}%'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => `${item.grade}${item.class}班`),
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '违纪率(%)'
    },
    series: [
      {
        type: 'bar',
        data: data.map(item => item.violation_rate),
        itemStyle: {
          color: '#FF6B6B'
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
        }
      }
    ]
  }
})

// 年级违纪情况对比图表配置
const gradeComparisonOption = computed(() => {
  if (!analysisData.value?.classAnalysis?.by_grade) {
    return {}
  }

  const gradeData = analysisData.value.classAnalysis.by_grade
  const grades = Object.keys(gradeData)
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['平均违纪率', '违纪总数']
    },
    xAxis: {
      type: 'category',
      data: grades
    },
    yAxis: [
      {
        type: 'value',
        name: '违纪率(%)',
        min: 0,
        max: 100
      },
      {
        type: 'value',
        name: '违纪总数',
        min: 0
      }
    ],
    series: [
      {
        name: '平均违纪率',
        type: 'bar',
        data: grades.map(grade => gradeData[grade].avg_violation_rate),
        itemStyle: {
          color: '#4ECDC4'
        }
      },
      {
        name: '违纪总数',
        type: 'line',
        yAxisIndex: 1,
        data: grades.map(grade => gradeData[grade].total_violations),
        itemStyle: {
          color: '#FF9F43'
        }
      }
    ]
  }
})

// 班级违纪趋势分析图表配置
const trendOption = computed(() => {
  if (!analysisData.value?.monthlyTrends) {
    return {}
  }

  const trends = analysisData.value.monthlyTrends
  return {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: trends.map(item => item.month),
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '违纪率(%)'
    },
    series: [
      {
        type: 'line',
        data: trends.map(item => item.violation_rate),
        itemStyle: {
          color: '#52C41A'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(82, 196, 26, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(82, 196, 26, 0.1)'
              }
            ]
          }
        }
      }
    ]
  }
})



// 获取分析数据
const fetchAnalysisData = async () => {
  try {
    const params = {}
    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0].toISOString().split('T')[0]
      params.end_date = dateRange.value[1].toISOString().split('T')[0]
    }
    if (selectedGrade.value) {
      params.grade = selectedGrade.value
    }

    const response = await api.get('/statistics/analysis', { params })
    analysisData.value = response.data
  } catch (error) {
    console.error('获取分析数据失败:', error)
    ElMessage.error('获取分析数据失败')
  }
}

// 处理日期变化
const handleDateChange = () => {
  fetchAnalysisData()
}

// 处理年级选择变化
const handleGradeChange = () => {
  fetchAnalysisData()
}

// 组件挂载时获取数据
onMounted(() => {
  fetchAnalysisData()
})
</script>

<style scoped>
.class-analysis-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 16px;
}

.analysis-card {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  color: #606266;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 320px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-card__header) {
  padding: 12px 20px;
  border-bottom: 1px solid #EBEEF5;
}
</style> 