<template>
  <div class="analysis-container">
    <div class="header">
      <h2>数据分析</h2>
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
        <el-select 
          v-model="selectedGrade" 
          placeholder="选择年级" 
          clearable 
          @change="handleGradeChange"
          style="width: 120px"
        >
          <el-option 
            v-for="grade in gradeOptions" 
            :key="grade.value" 
            :label="grade.label" 
            :value="grade.value"
          />
        </el-select>
        <el-select
          v-model="selectedClass"
          placeholder="选择班级"
          clearable
          @change="handleClassChange"
          style="width: 120px"
          :disabled="!selectedGrade"
        >
          <el-option
            v-for="option in classOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>

    <!-- 总体概况 -->
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

    <!-- 班级分析部分 -->
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
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>违纪类型分布</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="typeDistributionOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 其他分析图表 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>违纪类型趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="violationTypeTrendOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>学生违纪频次分布</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="studentViolationDistOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>违纪时段分布</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="timeDistributionOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>违纪原因分析</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="reasonAnalysisOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
import axios from 'axios'
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
const selectedClass = ref('')
const analysisData = ref({})
const classOptions = ref([])
const gradeOptions = ref([{ value: '', label: '全部年级' }])
const classInfo = ref({})

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

// 违纪类型分布图表配置
const typeDistributionOption = computed(() => {
  if (!analysisData.value?.violationTypeDist) {
    return {}
  }

  const data = analysisData.value.violationTypeDist
  const colors = [
    '#FF6B6B', '#FF8787', '#FFA5A5',  // 红色系
    '#FF9F43', '#FFC069', '#FFE0B2',  // 橙色系
    '#4ECDC4', '#45B7D1', '#96CEB4',  // 蓝绿色系
    '#52C41A', '#73D13D', '#95DE64'   // 绿色系
  ]

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `${params.name}<br/>` +
               `次数：${params.value}次<br/>` +
               `占比：${params.data.percentage}%`
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'center',
      formatter: (name) => {
        const item = data.find(d => d.type_name === name)
        return `${name} (${item ? item.count : 0}次)`
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params) => {
            return `${params.name}\n${params.percent}%`
          }
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: data.map((item, index) => ({
          name: item.type_name,
          value: item.count,
          percentage: item.percentage,
          itemStyle: {
            color: colors[index % colors.length]
          }
        }))
      }
    ]
  }
})

// 违纪类型趋势图表配置
const violationTypeTrendOption = computed(() => {
  if (!analysisData.value?.violationTypeTrends) {
    return {}
  }

  const trends = analysisData.value.violationTypeTrends || []
  const types = [...new Set(trends.map(item => item.type))]
  const months = [...new Set(trends.map(item => item.month))]
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: types,
      top: 10
    },
    grid: {
      top: 50,
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '次数'
    },
    series: types.map(type => ({
      name: type,
      type: 'line',
      smooth: true,
      data: months.map(month => {
        const record = trends.find(t => t.type === type && t.month === month)
        return record ? record.count : 0
      })
    }))
  }
})

// 学生违纪频次分布图表配置
const studentViolationDistOption = computed(() => {
  if (!analysisData.value?.studentViolationDist) {
    return {}
  }

  const data = analysisData.value.studentViolationDist || []
  console.log('违纪频次分布原始数据:', data)

  // 确保所有频次都有数据
  const frequencyMap = new Map(data.map(item => [item.times, item]))
  const allFrequencies = [0, 1, 2, 3, 4, 5]
  const completeData = allFrequencies.map(freq => {
    const existingData = frequencyMap.get(freq) || { times: freq, count: 0, percentage: 0 }
    return {
      ...existingData,
      count: Number(existingData.count || 0),
      percentage: Number(existingData.percentage || 0)
    }
  })

  // 验证数据
  const totalStudents = completeData.reduce((sum, item) => sum + item.count, 0)
  const totalPercentage = completeData.reduce((sum, item) => sum + item.percentage, 0)
  console.log('违纪频次分布统计:', {
    totalStudents,
    totalPercentage: totalPercentage.toFixed(2) + '%',
    data: completeData
  })

  // 如果总百分比有明显偏差，进行修正
  if (Math.abs(totalPercentage - 100) > 0.1) {
    console.warn('百分比总和不为100%，进行修正')
    completeData.forEach(item => {
      item.percentage = (item.count / totalStudents) * 100
    })
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = params[0].data
        return `违纪${params[0].name}<br/>` +
               `学生数：${data.value}人<br/>` +
               `占比：${data.percentage.toFixed(2)}%`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['0次', '1次', '2次', '3次', '4次', '5次及以上'],
      axisLabel: {
        interval: 0
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '学生数',
        position: 'left',
        axisLine: {
          show: true
        },
        axisLabel: {
          formatter: '{value}人'
        }
      },
      {
        type: 'value',
        name: '占比',
        position: 'right',
        axisLine: {
          show: true
        },
        axisLabel: {
          formatter: '{value}%'
        },
        max: 100
      }
    ],
    series: [
      {
        name: '违纪频次分布',
        type: 'bar',
        data: completeData.map(item => ({
          value: item.count,
          percentage: Number(item.percentage.toFixed(2)),
          itemStyle: {
            color: getViolationColor(item.times)
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params) => {
            return `${params.data.value}人\n${params.data.percentage}%`
          }
        }
      }
    ]
  }
})

// 违纪时段分布图表配置
const timeDistributionOption = computed(() => {
  if (!analysisData.value?.timeDistribution) {
    return {}
  }

  const data = analysisData.value.timeDistribution || []
  const total = data.morning + data.afternoon + data.evening
  
  // 自定义颜色方案
  const customColors = {
    '上午': {
      main: '#FFB37B',
      hover: '#FFC69E'
    },
    '下午': {
      main: '#73D13D',
      hover: '#95DE64'
    },
    '晚上': {
      main: '#597EF7',
      hover: '#85A5FF'
    }
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const percent = ((params.value / total) * 100).toFixed(1)
        return `${params.name}<br/>违纪次数：${params.value}次<br/>占比：${percent}%`
      },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: {
        color: '#666'
      }
    },
    legend: {
      top: '5%',
      left: 'center',
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        fontSize: 14,
        color: '#666'
      }
    },
    title: {
      text: `总违纪次数：${total}次`,
      left: 'center',
      top: '85%',
      textStyle: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'normal'
      }
    },
      series: [
        {
        type: 'pie',
        radius: ['45%', '65%'], // 调小外圈半径
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.1)'
        },
        label: {
          show: true,
          position: 'outside',
          alignTo: 'edge', // 标签对齐到边缘
          margin: 20, // 增加标签与图形的距离
          formatter: (params) => {
            const percent = ((params.value / total) * 100).toFixed(1)
            return [
              `{name|${params.name}}`,
              `{value|${params.value}次}`,
              `{percent|(${percent}%)}`
            ].join('\n')
          },
          distanceToLabelLine: 5, // 文字与引导线的距离
          rich: {
            name: {
              fontSize: 14,
              color: '#666',
              padding: [0, 0, 5, 0]
            },
            value: {
              fontSize: 16,
              fontWeight: 'bold',
              color: '#666',
              padding: [5, 0]
            },
            percent: {
              fontSize: 12,
              color: '#999',
              padding: [5, 0, 0, 0]
            }
          }
        },
        labelLine: {
          length: 20, // 第一段引导线长度
          length2: 30, // 第二段引导线长度
          maxSurfaceAngle: 80, // 引导线与图形的最大夹角
          smooth: 0.2, // 平滑程度
          minTurnAngle: 90, // 最小转角角度
          lineStyle: {
            width: 1,
            type: 'solid'
          }
        },
        labelLayout: {
          hideOverlap: true, // 隐藏重叠的标签
          moveOverlap: 'shiftY' // Y轴方向移动重叠的标签
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          },
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data: [
          { 
            name: '上午',
            value: data.morning || 0,
            itemStyle: {
              color: customColors['上午'].main
            },
            emphasis: {
              itemStyle: {
                color: customColors['上午'].hover
              }
            }
          },
          { 
            name: '下午',
            value: data.afternoon || 0,
            itemStyle: {
              color: customColors['下午'].main
            },
            emphasis: {
              itemStyle: {
                color: customColors['下午'].hover
              }
            }
          },
          { 
            name: '晚上',
            value: data.evening || 0,
            itemStyle: {
              color: customColors['晚上'].main
            },
            emphasis: {
              itemStyle: {
                color: customColors['晚上'].hover
              }
            }
          }
        ].sort((a, b) => b.value - a.value) // 按数值大小排序
      }
    ]
  }
})

// 违纪原因分析图表配置
const reasonAnalysisOption = computed(() => {
  if (!analysisData.value?.reasonAnalysis) {
    return {}
  }

  const data = analysisData.value.reasonAnalysis || []
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '次数'
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.reason),
      axisLabel: {
        interval: 0
      }
    },
    series: [
      {
        type: 'bar',
        data: data.map(item => ({
          value: item.count,
          itemStyle: {
            color: '#FF9F43'
          }
        })),
        label: {
          show: true,
          position: 'right'
        }
      }
    ]
  }
})

// 辅助函数：获取违纪次数对应的颜色
const getViolationColor = (times) => {
  const colors = {
    0: '#95DE64',  // 浅绿 - 未违纪
    1: '#FFB37B',  // 浅橙 - 轻微
    2: '#FF9F43',  // 橙色 - 一般
    3: '#FF7875',  // 浅红 - 较重
    4: '#FF6B6B',  // 红色 - 严重
    5: '#FF4D4F'   // 深红 - 非常严重
  }
  return colors[times] || colors[5]
}

// 获取年级和班级信息
const fetchClassInfo = async () => {
  try {
    const response = await axios.get('/api/statistics/class-info')
    classInfo.value = response.data
    
    // 更新年级选项
    const grades = Object.keys(classInfo.value).map(grade => ({
      value: grade,
      label: grade
    }))
    gradeOptions.value = [{ value: '', label: '全部年级' }, ...grades]
    
    // 如果当前选中的年级不在可选范围内，清空选择
    if (selectedGrade.value && !classInfo.value[selectedGrade.value]) {
      selectedGrade.value = ''
      selectedClass.value = ''
    }
    
    // 更新班级选项
    updateClassOptions()
  } catch (error) {
    console.error('获取年级和班级信息失败:', error)
    ElMessage.error('获取年级和班级信息失败')
  }
}

// 更新班级选项
const updateClassOptions = () => {
  if (selectedGrade.value && classInfo.value[selectedGrade.value]) {
    classOptions.value = classInfo.value[selectedGrade.value].map(classInfo => ({
      value: classInfo.value,
      label: `${classInfo.label}班`
    })).sort((a, b) => {
      // 确保双优始终排在最前面
      if (a.label === '双优班') return -1;
      if (b.label === '双优班') return 1;
      return parseInt(a.value) - parseInt(b.value);
    });
  } else {
    classOptions.value = []
    selectedClass.value = ''
  }
}

// 处理年级变化
const handleGradeChange = () => {
  updateClassOptions()
  fetchAnalysisData()
}

// 处理班级变化
const handleClassChange = () => {
  fetchAnalysisData()
}

// 更新获取分析数据的函数
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
    if (selectedClass.value) {
      // 从显示值中移除"班"字后传递给后端
      params.class = selectedClass.value.replace('班', '')
    }

    const response = await axios.get('/api/statistics/analysis', { params })
    analysisData.value = response.data
  } catch (error) {
    console.error('获取分析数据失败:', error)
    ElMessage.error('获取分析数据失败')
  }
}

// 监听年级变化
watch(selectedGrade, () => {
  updateClassOptions()
})

// 组件挂载时获取数据
onMounted(() => {
  fetchClassInfo()
  fetchAnalysisData()
})

// 处理日期变化
const handleDateChange = () => {
  fetchAnalysisData()
}
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
  background-color: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.filters {
  display: flex;
  gap: 16px;
  align-items: center;
}

:deep(.el-select) {
  .el-input__wrapper {
    background-color: #f5f7fa;
  }
  
  .el-select__tags {
    background-color: transparent;
  }
}

:deep(.el-date-editor) {
  background-color: #f5f7fa;
  border-radius: 4px;
  
  .el-range-separator {
    color: #606266;
  }
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