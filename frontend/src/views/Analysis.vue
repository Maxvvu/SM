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
              <span>优秀学生数</span>
            </div>
          </template>
          <div class="stat-number">
            {{ statistics.excellentStudents }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>行为类型分布</span>
            </div>
          </template>
          <div class="chart-container">
            <div ref="behaviorTypeChart" style="width: 100%; height: 300px"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>年级行为趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <div ref="gradeTrendChart" style="width: 100%; height: 300px"></div>
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
const behaviorTypeChart = ref(null)
const gradeTrendChart = ref(null)
const trendChart = ref(null)
let charts = []

// 统计数据
const statistics = ref({
  totalViolations: 0,
  totalExcellent: 0,
  violationStudents: 0,
  excellentStudents: 0
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
  // 行为类型分布图
  const typeChart = echarts.init(behaviorTypeChart.value)
  typeChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}次 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [{
      name: '行为类型分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}: {c}次'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '16',
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      data: []
    }]
  })

  // 年级行为趋势图
  const gradeChart = echarts.init(gradeTrendChart.value)
  gradeChart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['违纪', '优秀']
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
        data: []
      },
      {
        name: '优秀',
        type: 'bar',
        data: []
      }
    ]
  })

  // 行为记录趋势图
  const timeChart = echarts.init(trendChart.value)
  timeChart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['违纪', '优秀']
    },
    xAxis: {
      type: 'time',
      boundaryGap: false
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '违纪',
        type: 'line',
        data: []
      },
      {
        name: '优秀',
        type: 'line',
        data: []
      }
    ]
  })

  charts = [typeChart, gradeChart, timeChart]
}

// 获取统计数据
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      grade: filterGrade.value,
      start_date: dateRange.value?.[0]?.toISOString(),
      end_date: dateRange.value?.[1]?.toISOString()
    }
    
    const response = await axios.get('/api/statistics', { params })
    const data = response.data

    // 更新统计数字
    statistics.value = {
      totalViolations: data.overview?.behavior_stats?.find(s => s.category === '违纪')?.total_count || 0,
      totalExcellent: data.overview?.behavior_stats?.find(s => s.category === '优秀')?.total_count || 0,
      violationStudents: data.overview?.behavior_stats?.find(s => s.category === '违纪')?.student_count || 0,
      excellentStudents: data.overview?.behavior_stats?.find(s => s.category === '优秀')?.student_count || 0
    }

    // 更新行为类型分布图
    charts[0].setOption({
      series: [{
        data: data.type_distribution || []
      }]
    })

    // 更新年级行为趋势图
    const gradeData = data.class_ranking || []
    const gradeViolations = ['高一', '高二', '高三'].map(grade => 
      gradeData.find(item => item.grade === grade)?.count || 0
    )
    const gradeExcellent = ['高一', '高二', '高三'].map(grade => 
      gradeData.find(item => item.grade === grade)?.student_count || 0
    )

    charts[1].setOption({
      series: [
        {
          data: gradeViolations
        },
        {
          data: gradeExcellent
        }
      ]
    })

    // 更新行为记录趋势图
    const trendData = data.trend || []
    const violationTrend = trendData
      .filter(item => item.category === '违纪')
      .map(item => [item.date, item.count])
    const excellentTrend = trendData
      .filter(item => item.category === '优秀')
      .map(item => [item.date, item.count])

    charts[2].setOption({
      series: [
        {
          data: violationTrend
        },
        {
          data: excellentTrend
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

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 