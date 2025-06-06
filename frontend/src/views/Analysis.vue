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
import axios from 'axios'
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
    const response = await axios.get('/api/statistics/risk-warning', {
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

.risk-warning-card {
  height: auto !important;
  transition: all 0.3s ease;
}

.risk-warning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-icon {
  font-size: 20px;
  color: #FF4D4F;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2f3d;
}

.warning-count {
  margin-left: 8px;
}

.time-selector {
  background: #f5f7fa;
  padding: 2px;
  border-radius: 4px;
}

.risk-warning-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 20px;
}

.risk-chart-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2f3d;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.high {
  background-color: #FF4D4F;
}

.legend-dot.medium {
  background-color: #FAAD14;
}

.legend-dot.low {
  background-color: #52C41A;
}

.risk-chart {
  height: 300px;
}

.risk-list-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.risk-table {
  margin-top: 16px;
}

.student-name {
  font-weight: 500;
  color: #1f2f3d;
}

.rate-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rate-value {
  font-size: 13px;
  color: #606266;
}

.rate-progress {
  margin-top: 4px;
}

.date-text {
  color: #606266;
}

.risk-level-box {
  display: flex;
  align-items: center;
}

.risk-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

.risk-icon {
  font-size: 14px;
}

.violation-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.type-tag {
  margin: 2px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
  --el-table-header-bg-color: var(--el-fill-color-light);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-table__header) {
  font-weight: 600;
}

:deep(.el-table__row) {
  transition: all 0.3s ease;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

:deep(.el-progress-bar__inner) {
  transition: all 0.3s ease;
}

:deep(.el-tag) {
  border: none;
}

:deep(.el-radio-button__inner) {
  padding: 8px 15px;
}

/* 响应式调整 */
@media screen and (max-width: 1200px) {
  .risk-chart {
    height: 250px;
  }
}

@media screen and (max-width: 768px) {
  .risk-chart {
    height: 200px;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .chart-legend {
    margin-top: 8px;
  }
}
</style> 