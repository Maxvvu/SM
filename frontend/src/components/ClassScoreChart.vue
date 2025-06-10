<template>
  <div class="score-chart-container">
    <div class="chart-header">
      <h3>班级分数历史</h3>
      <div class="date-range">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          @change="handleDateChange"
        />
      </div>
    </div>
    <div class="chart-content" v-loading="loading">
      <div ref="chartRef" style="width: 100%; height: 400px"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'
import moment from 'moment'

const props = defineProps({
  grade: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  }
})

const chartRef = ref(null)
const chart = ref(null)
const loading = ref(false)
const dateRange = ref([])
const scoreHistory = ref([])

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

// 获取分数历史数据
const fetchScoreHistory = async () => {
  loading.value = true
  try {
    const params = {}
    if (dateRange.value?.length === 2) {
      params.startDate = moment(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = moment(dateRange.value[1]).format('YYYY-MM-DD')
    }
    
    const response = await axios.get(
      `/api/statistics/class-score-history/${props.grade}/${props.class}`,
      { params }
    )
    scoreHistory.value = response.data
    updateChart()
  } catch (error) {
    console.error('获取分数历史失败:', error)
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  if (!chart.value || !scoreHistory.value.length) return

  const dates = scoreHistory.value.map(item => item.date)
  const scores = scoreHistory.value.map(item => item.total_score)
  const changes = scoreHistory.value.map(item => item.daily_change)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['总分', '日变化']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        formatter: (value) => moment(value).format('MM-DD')
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '总分',
        position: 'left',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#409EFF'
          }
        },
        axisLabel: {
          formatter: '{value} 分'
        },
        splitLine: {
          show: true
        }
      },
      {
        type: 'value',
        name: '日变化',
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#67C23A'
          }
        },
        axisLabel: {
          formatter: '{value} 分'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '总分',
        type: 'line',
        smooth: true,
        data: scores,
        itemStyle: {
          color: '#409EFF'
        },
        markLine: {
          data: [
            {
              name: '基准线',
              yAxis: 1000,
              lineStyle: {
                type: 'dashed',
                color: '#909399'
              },
              label: {
                formatter: '基础分：1000'
              }
            }
          ]
        }
      },
      {
        name: '日变化',
        type: 'bar',
        yAxisIndex: 1,
        data: changes,
        itemStyle: {
          color: (params) => {
            return params.data >= 0 ? '#67C23A' : '#F56C6C'
          }
        }
      }
    ]
  }

  chart.value.setOption(option)
}

// 处理日期变化
const handleDateChange = () => {
  fetchScoreHistory()
}

// 监听属性变化
watch([() => props.grade, () => props.class], () => {
  fetchScoreHistory()
})

// 初始化图表
onMounted(() => {
  if (chartRef.value) {
    chart.value = echarts.init(chartRef.value)
    // 设置默认日期范围为最近一月
    dateRange.value = dateShortcuts[1].value()
    fetchScoreHistory()
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      chart.value?.resize()
    })
  }
})
</script>

<style scoped>
.score-chart-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.chart-content {
  min-height: 400px;
}
</style> 