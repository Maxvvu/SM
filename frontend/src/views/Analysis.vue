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
    <el-row :gutter="24" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">班级违纪率排名</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="classRankingOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">年级违纪情况对比</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="gradeComparisonOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="24" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">班级违纪趋势分析</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="trendOption" autoresize />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">违纪原因分析</span>
            </div>
          </template>
          <div class="chart-container">
            <VChart :option="reasonAnalysisOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 风险预警组件 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="24">
        <el-card class="chart-card risk-warning-card" shadow="hover">
          <template #header>
            <div class="card-header risk-warning-header">
              <div class="header-left">
                <el-icon class="warning-icon"><warning-filled /></el-icon>
                <span class="title">学生违纪高风险预警</span>
                <el-tag 
                  type="danger" 
                  effect="dark" 
                  size="small" 
                  class="warning-count"
                  v-if="riskWarningData.length"
                >
                  {{ riskWarningData.length }}人
                </el-tag>
              </div>
              <div class="header-right">
                <el-radio-group 
                  v-model="riskDays" 
                  size="small" 
                  @change="fetchRiskWarningData"
                  class="time-selector"
                >
                  <el-radio-button label="7">最近7天</el-radio-button>
                  <el-radio-button label="30">最近30天</el-radio-button>
                  <el-radio-button label="90">最近90天</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>
          <div class="risk-warning-container">
            <!-- 图表部分 -->
            <div class="risk-chart-section" v-show="riskWarningData.length > 0">
              <div class="chart-header">
                <h4 class="section-title">风险学生TOP10</h4>
                <div class="chart-legend">
                  <span class="legend-item">
                    <span class="legend-dot high"></span>
                    高风险 ({{ riskDays === '7' ? '≥5次/周' : '≥20次/月' }})
                  </span>
                  <span class="legend-item">
                    <span class="legend-dot medium"></span>
                    中风险 ({{ riskDays === '7' ? '≥3次/周' : '≥15次/月' }})
                  </span>
                  <span class="legend-item">
                    <span class="legend-dot low"></span>
                    低风险 ({{ riskDays === '7' ? '≥2次/周' : '≥10次/月' }})
                  </span>
                </div>
              </div>
              <div class="risk-chart">
                <VChart :option="riskWarningOption" autoresize />
              </div>
            </div>

            <!-- 表格部分 -->
            <div class="risk-list-section" v-loading="riskLoading">
              <div class="list-header">
                <h4 class="section-title">详细数据</h4>
                <el-button 
                  type="primary" 
                  size="small" 
                  :icon="Download"
                  @click="exportRiskData"
                >
                  导出数据
                </el-button>
              </div>
              <el-empty 
                v-if="!riskWarningData.length" 
                description="暂无风险预警数据"
                class="custom-empty"
              >
                <template #image>
                  <el-icon class="empty-icon"><warning /></el-icon>
                </template>
                <template #description>
                  <div class="empty-text">
                    <p>暂无风险预警数据</p>
                    <small class="sub-text">所选时间范围内未发现高风险违纪行为</small>
                  </div>
                </template>
              </el-empty>
              <el-table 
                v-else
                :data="riskWarningData" 
                style="width: 100%"
                :header-cell-style="{ background: '#f5f7fa' }"
                border
                stripe
                highlight-current-row
                class="risk-table"
              >
                <el-table-column prop="name" label="学生姓名" width="100" fixed>
                  <template #default="{ row }">
                    <span class="student-name">{{ row.name }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="grade" label="年级" width="80" />
                <el-table-column prop="class" label="班级" width="80">
                  <template #default="{ row }">
                    {{ row.class }}班
                  </template>
                </el-table-column>
                <el-table-column prop="violation_count" label="违纪次数" width="100">
                  <template #default="{ row }">
                    <el-badge 
                      :value="row.violation_count" 
                      :type="row.risk_level === '高' ? 'danger' : row.risk_level === '中' ? 'warning' : 'info'"
                    />
                  </template>
                </el-table-column>
                <el-table-column prop="monthly_rate" label="月度频率" width="120">
                  <template #default="{ row }">
                    <div class="rate-box">
                      <span class="rate-value">{{ row.monthly_rate }}%</span>
                      <el-progress 
                        :percentage="getProgressPercentage(row)"
                        :status="row.risk_level === '高' ? 'exception' : row.risk_level === '中' ? 'warning' : 'success'"
                        :stroke-width="8"
                        class="rate-progress"
                      />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="latest_violation_date" label="最近违纪日期" width="120">
                  <template #default="{ row }">
                    <el-tooltip 
                      :content="'距今: ' + getDaysDiff(row.latest_violation_date) + '天'"
                      placement="top"
                    >
                      <span class="date-text">{{ formatDate(row.latest_violation_date) }}</span>
                    </el-tooltip>
                  </template>
                </el-table-column>
                <el-table-column prop="risk_level" label="风险等级" width="120">
                  <template #default="{ row }">
                    <div class="risk-level-box">
                      <el-tag
                        :type="row.risk_level === '高' ? 'danger' : row.risk_level === '中' ? 'warning' : 'success'"
                        effect="light"
                        class="risk-tag"
                      >
                        <el-icon class="risk-icon"><warning /></el-icon>
                        {{ row.risk_level }}级风险
                      </el-tag>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="violation_types" label="违纪类型" min-width="200">
                  <template #default="{ row }">
                    <el-tooltip
                      :content="row.violation_types"
                      placement="top"
                      :show-after="200"
                    >
                      <div class="violation-types">
                        <el-tag
                          v-for="(type, index) in row.violation_types.split(', ')"
                          :key="index"
                          size="small"
                          class="type-tag"
                          :style="getTypeTagStyle(index)"
                        >
                          {{ type }}
                        </el-tag>
                      </div>
                    </el-tooltip>
                  </template>
                </el-table-column>
              </el-table>
            </div>
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
import api from '../api'
import { ElMessage } from 'element-plus'
import { Warning, WarningFilled, Download } from '@element-plus/icons-vue'

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
  console.log('班级违纪率排名数据:', data)
  
  // 如果是筛选了特定班级，则只显示该班级的数据
  const displayData = selectedClass.value ? 
    data.filter(item => {
      const className = item.class === '双优' ? '双优班' : `${item.class}班`
      return className === selectedClass.value
    }) : data

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>违纪率: {c}%'
    },
    xAxis: {
      type: 'category',
      data: displayData.map(item => {
        if (item.class === '双优') {
          return `${item.grade}双优班`
        }
        return `${item.grade}${item.class}班`
      }),
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '违纪率(%)',
      min: 0,
      max: 100
    },
    series: [
      {
        type: 'bar',
        data: displayData.map(item => ({
          value: item.violation_rate,
          itemStyle: {
            color: item.class === '双优' ? '#8A2BE2' : '#FF6B6B'
          }
        })),
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
  console.log('年级违纪情况数据:', gradeData)
  
  // 如果选择了特定年级，只显示该年级数据
  const grades = selectedGrade.value ? 
    [selectedGrade.value] : 
    Object.keys(gradeData)
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const grade = params[0].axisValue
        return `${grade}<br/>` +
               `平均违纪率: ${params[0].value}%<br/>` +
               `违纪总数: ${params[1].value}次`
      }
    },
    legend: {
      data: ['平均违纪率', '违纪总数']
    },
    xAxis: {
      type: 'category',
      data: grades,
      axisLabel: {
        interval: 0
      }
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
        data: grades.map(grade => ({
          value: gradeData[grade].avg_violation_rate,
          itemStyle: {
            color: '#4ECDC4'
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
        }
      },
      {
        name: '违纪总数',
        type: 'line',
        yAxisIndex: 1,
        data: grades.map(grade => ({
          value: gradeData[grade].total_violations,
          itemStyle: {
            color: '#FF9F43'
          }
        })),
        label: {
          show: true,
          position: 'top'
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
  console.log('违纪趋势数据:', trends)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `${params[0].axisValue}<br/>违纪率: ${params[0].value}%`
      }
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
      name: '违纪率(%)',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        type: 'line',
        data: trends.map(item => ({
          value: item.violation_rate,
          itemStyle: {
            color: '#52C41A'
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
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

// 违纪原因分析图表配置
const reasonAnalysisOption = computed(() => {
  if (!analysisData.value?.reasonAnalysis) {
    return {}
  }

  const data = analysisData.value.reasonAnalysis
  console.log('违纪原因分析数据:', data)

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
    const response = await api.get('/statistics/class-info')
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
    
    console.log('班级信息:', classInfo.value)
  } catch (error) {
    console.error('获取年级和班级信息失败:', error)
    ElMessage.error('获取年级和班级信息失败')
  }
}

// 更新班级选项
const updateClassOptions = () => {
  if (selectedGrade.value && classInfo.value[selectedGrade.value]) {
    classOptions.value = classInfo.value[selectedGrade.value].map(classInfo => ({
      value: classInfo.class_name || classInfo.value,
      label: classInfo.class_name === '双优' ? '双优班' : `${classInfo.label}班`
    })).sort((a, b) => {
      // 确保双优班始终排在最前面
      if (a.value === '双优') return -1;
      if (b.value === '双优') return 1;
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
  console.log('选择的班级:', selectedClass.value)
  fetchAnalysisData()
}

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
    if (selectedClass.value) {
      // 处理班级参数，确保双优班正确传递
      params.class = selectedClass.value === '双优班' ? '双优' : selectedClass.value.replace('班', '')
    }

    console.log('发送请求参数:', params)
    const response = await api.get('/statistics/analysis', { params })
    console.log('获取分析数据响应:', response.data)
    
    if (!response || !response.data) {
      throw new Error('获取数据失败：服务器响应异常')
    }

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

// 风险预警相关数据
const riskDays = ref('30')
const riskWarningData = ref([])
const riskLoading = ref(false)

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 获取风险预警数据
const fetchRiskWarningData = async () => {
  riskLoading.value = true
  try {
    const response = await api.get('/statistics/risk-warning', {
      params: { 
        days: riskDays.value,
        grade: selectedGrade.value,
        class: selectedClass.value
      }
    })
    riskWarningData.value = response.data
    console.log('风险预警数据:', response.data)
  } catch (error) {
    console.error('获取风险预警数据失败:', error)
    ElMessage.error('获取风险预警数据失败')
    riskWarningData.value = []
  } finally {
    riskLoading.value = false
  }
}

// 风险预警图表配置
const riskWarningOption = computed(() => {
  if (!riskWarningData.value.length) return {}

  const data = riskWarningData.value.slice(0, 10)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = params[0]
        const row = riskWarningData.value[data.dataIndex]
        const timeRange = riskDays.value === '7' ? '周' : '月'
        return `${data.name}<br/>
                违纪次数: ${row.violation_count}次/${timeRange}<br/>
                风险等级: ${row.risk_level}级<br/>
                最近违纪: ${formatDate(row.latest_violation_date)}`
      }
    },
    grid: {
      top: '5%',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => `${item.name}\n(${item.grade}${item.class}班)`),
      axisLabel: {
        interval: 0,
        formatter: (value) => {
          const lines = value.split('\n')
          return lines.map(line => {
            return line.length > 8 ? line.substring(0, 8) + '...' : line
          }).join('\n')
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '月度违纪频率(%)',
      nameTextStyle: {
        padding: [0, 0, 0, 30]
      }
    },
    series: [
      {
        name: '违纪次数',
        type: 'bar',
        barWidth: '40%',
        data: data.map(item => ({
          value: item.violation_count,
          itemStyle: {
            color: item.risk_level === '高' ? '#FF4D4F' :
                   item.risk_level === '中' ? '#FAAD14' : '#52C41A'
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}次',
          fontSize: 12
        }
      }
    ]
  }
})

// 监听日期范围变化
watch([dateRange, selectedGrade, selectedClass], () => {
  fetchRiskWarningData()
})

// 获取违纪类型标签样式
const getTypeTagStyle = (index) => {
  const colors = [
    { color: '#FF4D4F', backgroundColor: '#FFF1F0' },
    { color: '#FAAD14', backgroundColor: '#FFF7E6' },
    { color: '#52C41A', backgroundColor: '#F6FFED' },
    { color: '#1890FF', backgroundColor: '#E6F7FF' },
    { color: '#722ED1', backgroundColor: '#F9F0FF' }
  ]
  return colors[index % colors.length]
}

// 计算距今天数
const getDaysDiff = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const today = new Date()
  const diffTime = Math.abs(today - date)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// 导出风险数据
const exportRiskData = () => {
  // 创建CSV内容
  const headers = ['学生姓名', '年级', '班级', '违纪次数', '月度频率', '最近违纪日期', '风险等级', '违纪类型']
  const csvContent = [
    headers.join(','),
    ...riskWarningData.value.map(row => [
      row.name,
      row.grade,
      `${row.class}班`,
      row.violation_count,
      `${row.monthly_rate}%`,
      formatDate(row.latest_violation_date),
      `${row.risk_level}级风险`,
      row.violation_types
    ].join(','))
  ].join('\n')

  // 创建Blob对象
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `风险预警数据_${formatDate(new Date())}.csv`
  link.click()
}

// 在script部分添加新的计算方法
const getProgressPercentage = (row) => {
  const maxCount = riskDays.value === '7' ? 5 : 20
  return Math.min(100, (row.violation_count / maxCount) * 100)
}
</script>

<style scoped>
.analysis-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.header h2 {
  margin: 0;
  font-size: 22px;
  color: #1f2f3d;
  font-weight: 600;
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
  margin-bottom: 24px;
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
}

.analysis-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-item {
  text-align: center;
  padding: 24px;
  border-radius: 4px;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background-color: #e9ecef;
  transform: translateY(-2px);
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 12px;
  line-height: 1.2;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.chart-row {
  margin-bottom: 24px;
}

.chart-card {
  height: 450px;
  transition: all 0.3s ease;
}

.chart-container {
  height: 370px;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #EBEEF5;
  background-color: #fafafa;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2f3d;
  position: relative;
  padding-left: 12px;
}

.card-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: #409EFF;
  border-radius: 2px;
}

:deep(.el-card__header) {
  padding: 0;
  border-bottom: none;
}

/* 响应式设计 */
@media screen and (max-width: 1400px) {
  .chart-card {
    height: 400px;
  }
  
  .chart-container {
    height: 320px;
  }
}

@media screen and (max-width: 1200px) {
  .chart-card {
    height: 350px;
  }
  
  .chart-container {
    height: 270px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}

@media screen and (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .filters {
    flex-wrap: wrap;
    width: 100%;
  }
  
  :deep(.el-select),
  :deep(.el-date-editor) {
    width: 100% !important;
  }
  
  .el-col {
    width: 100% !important;
  }
  
  .chart-card {
    height: 300px;
    margin-bottom: 16px;
  }
  
  .chart-container {
    height: 220px;
  }
}

/* 美化滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
</style> 