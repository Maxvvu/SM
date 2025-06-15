<template>
  <div class="dashboard-container">
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover" class="dashboard-card student-distribution-card">
          <template #header>
            <div class="card-header">
              <span>学生分布统计</span>
            </div>
          </template>
          <div class="student-stats">
            <div class="total-students">
              <div class="stat-value">{{ totalStudents }}</div>
              <div class="stat-label">学生总人数</div>
            </div>
            <div class="grade-distribution">
              <div ref="gradeChart" style="width: 100%; height: 300px"></div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover" class="dashboard-card behavior-card">
          <template #header>
            <div class="card-header">
              <span>学生行为统计</span>
              <el-radio-group v-model="selectedPeriod" @change="handlePeriodChange" size="small">
                <el-radio-button :value="1">近1个月</el-radio-button>
                <el-radio-button :value="3">近3个月</el-radio-button>
                <el-radio-button :value="6">近6个月</el-radio-button>
                <el-radio-button :value="12">近1年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="behavior-stats">
            <div class="stat-item violation" :class="getViolationClass">
              <div class="stat-value">{{ violationCount }}</div>
              <div class="stat-label">违规行为</div>
              <div class="stat-period">{{ periodText }}</div>
            </div>
            <div class="stat-item excellent" :class="getExcellentClass">
              <div class="stat-value">{{ excellentCount }}</div>
              <div class="stat-label">优秀行为</div>
              <div class="stat-period">{{ periodText }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const selectedPeriod = ref(1)
const violationCount = ref(0)
const excellentCount = ref(0)
const totalStudents = ref(0)
const gradeChart = ref(null)
let gradeChartInstance = null

const periodText = computed(() => {
  const periods = {
    1: '近1个月',
    3: '近3个月',
    6: '近6个月',
    12: '近1年'
  }
  return periods[selectedPeriod.value]
})

const getViolationClass = computed(() => {
  const count = violationCount.value
  const period = selectedPeriod.value

  const thresholds = {
    '1': { warning: 50, danger: 100 },    // 1个月
    '3': { warning: 100, danger: 200 },   // 3个月
    '6': { warning: 200, danger: 400 },   // 6个月
    '12': { warning: 400, danger: 800 }   // 12个月
  }

  const { warning, danger } = thresholds[period]
  
  if (count >= danger) return 'danger'
  if (count >= warning) return 'warning'
  return 'normal'
})

const getExcellentClass = computed(() => {
  const count = excellentCount.value
  const period = selectedPeriod.value

  const thresholds = {
    '1': { good: 30, excellent: 60 },     // 1个月
    '3': { good: 60, excellent: 120 },    // 3个月
    '6': { good: 120, excellent: 240 },   // 6个月
    '12': { good: 240, excellent: 480 }   // 12个月
  }

  const { good, excellent } = thresholds[period]
  
  if (count >= excellent) return 'excellent'
  if (count >= good) return 'good'
  return 'normal'
})

const handlePeriodChange = async () => {
  await fetchBehaviorStats()
}

const fetchBehaviorStats = async () => {
  try {
    const now = new Date()
    const startDate = new Date(now)
    startDate.setMonth(now.getMonth() - selectedPeriod.value)

    const [violationResponse, excellentResponse] = await Promise.all([
      api.get('/api/behaviors/stats', {
        params: {
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
          type: 'violation'
        }
      }),
      api.get('/api/behaviors/stats', {
        params: {
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
          type: 'excellent'
        }
      })
    ])

    if (violationResponse && typeof violationResponse.count === 'number') {
      violationCount.value = violationResponse.count
    }
    if (excellentResponse && typeof excellentResponse.count === 'number') {
      excellentCount.value = excellentResponse.count
    }
  } catch (error) {
    console.error('获取行为统计失败:', error)
    ElMessage.error('获取行为统计失败')
  }
}

const fetchStudentStats = async () => {
  try {
    const data = await api.get('/api/statistics')
    
    totalStudents.value = data.overview.total_students
    
    // 初始化年级分布图表
    if (gradeChartInstance) {
      gradeChartInstance.dispose()
    }
    
    gradeChartInstance = echarts.init(gradeChart.value)
    const gradeData = data.overview.grade_distribution
    
    gradeChartInstance.setOption({
      title: {
        text: '年级分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}人 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: ['高一', '高二', '高三']
      },
      series: [
        {
          name: '年级分布',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {c}人'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold'
            }
          },
          data: [
            {
              name: '高一',
              value: gradeData['高一'] || 0,
              itemStyle: { color: '#67c23a' }  // 绿色
            },
            {
              name: '高二',
              value: gradeData['高二'] || 0,
              itemStyle: { color: '#e6a23c' }  // 橙色
            },
            {
              name: '高三',
              value: gradeData['高三'] || 0,
              itemStyle: { color: '#f56c6c' }  // 红色
            }
          ]
        }
      ]
    })
  } catch (error) {
    console.error('获取学生统计数据失败:', error)
    ElMessage.error('获取学生统计数据失败')
  }
}

// 监听窗口大小变化
const handleResize = () => {
  gradeChartInstance?.resize()
}

onMounted(async () => {
  await Promise.all([
    fetchBehaviorStats(),
    fetchStudentStats()
  ])
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  gradeChartInstance?.dispose()
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.dashboard-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.behavior-stats {
  display: flex;
  justify-content: space-around;
  padding: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  min-width: 200px;
  transition: all 0.3s ease;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 16px;
  color: #666;
  margin-bottom: 5px;
}

.stat-period {
  font-size: 14px;
  color: #999;
}

.violation {
  background-color: #f8f9fa;
}

.violation.warning {
  background-color: #fff7e6;
}
.violation.warning .stat-value {
  color: #faad14;
}

.violation.danger {
  background-color: #fff1f0;
}
.violation.danger .stat-value {
  color: #f5222d;
}

.excellent {
  background-color: #f8f9fa;
}

.excellent.good {
  background-color: #f6ffed;
}
.excellent.good .stat-value {
  color: #52c41a;
}

.excellent.excellent {
  background-color: #e6f7ff;
}
.excellent.excellent .stat-value {
  color: #1890ff;
}

.student-distribution-card {
  margin-bottom: 20px;
}

.student-stats {
  display: flex;
  align-items: center;
  padding: 20px;
}

.total-students {
  flex: 0 0 200px;
  text-align: center;
  padding: 20px;
  border-right: 1px solid #eee;
}

.grade-distribution {
  flex: 1;
  padding-left: 20px;
}

.total-students .stat-value {
  font-size: 48px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 10px;
}

.total-students .stat-label {
  font-size: 16px;
  color: #666;
}
</style> 