<template>
  <div class="teachers-container">
    <div class="header">
      <h2>分数统计</h2>
      <div class="header-right">
        <div class="filter-section">
          <el-date-picker
            v-model="selectedMonth"
            type="month"
            placeholder="选择月份"
            format="YYYY年MM月"
            value-format="YYYY-MM"
            :clearable="false"
            :disabled-date="disabledDate"
            @change="handleMonthChange"
          />
        </div>
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索教师姓名"
            clearable
            @input="handleSearch"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </div>

    <div class="table-container">
      <el-table 
        :data="paginatedTeachers" 
        style="width: 100%"
        v-loading="loading"
        element-loading-text="加载中..."
        @sort-change="handleSortChange"
      >
        <el-table-column prop="name" label="姓名" sortable="custom" />
        <el-table-column prop="classes" label="管理班级">
          <template #default="scope">
            <el-tag
              v-for="(cls, index) in scope.row.classes"
              :key="index"
              type="info"
              size="small"
              class="class-tag"
            >
              {{ cls }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="studentCount" label="学生数量" sortable="custom" width="120" />
        <el-table-column prop="violationCount" label="违纪总数" sortable="custom" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.violationCount > 0 ? 'danger' : 'info'" size="small">
              {{ scope.row.violationCount }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="班级总分" sortable="custom" width="200">
          <template #default="scope">
            <div class="score-container">
              <div class="score-info">
                <span class="base-score">基础分：1000</span>
                <el-divider direction="vertical" />
                <span :class="['current-score', scope.row.score < 1000 ? 'negative' : 'positive']">
                  当前：{{ scope.row.score }}
                </span>
              </div>
              <div class="score-change">
                <span :class="['change', scope.row.scoreChange >= 0 ? 'positive' : 'negative']">
                  {{ scope.row.scoreChange >= 0 ? '+' : '' }}{{ scope.row.scoreChange }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredTeachers.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import axios from 'axios'
import moment from 'moment'

// 状态变量
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const teachers = ref([])
const behaviors = ref([])
const behaviorTypes = ref([])
const selectedMonth = ref(moment().format('YYYY-MM'))
const teacherMap = ref(new Map())
const refreshTimer = ref(null)

// 禁用未来月份
const disabledDate = (time) => {
  return time.getTime() > Date.now()
}

// 处理月份变化
const handleMonthChange = () => {
  fetchTeachers()
}

// 从学生数据中获取教师信息
const fetchTeachers = async () => {
  loading.value = true
  try {
    const [studentsResponse, behaviorsResponse, teacherBehaviorsResponse] = await Promise.all([
      axios.get('/api/students'),
      axios.get('/api/behaviors'),
      axios.get('/api/teacher-behaviors')
    ])
    
    const students = studentsResponse.data
    behaviors.value = behaviorsResponse.data
    const teacherBehaviors = teacherBehaviorsResponse.data
    
    // 提取所有不重复的教师信息
    teacherMap.value = new Map()
    students.forEach(student => {
      if (student.teacher) {
        if (!teacherMap.value.has(student.teacher)) {
          teacherMap.value.set(student.teacher, {
            name: student.teacher,
            classes: new Set([`${student.grade}年级${student.class}班`]),
            studentCount: 1,
            violationCount: 0,
            score: 1000,
            scoreChange: 0,
            monthlyScores: {}
          })
        } else {
          const teacherData = teacherMap.value.get(student.teacher)
          teacherData.classes.add(`${student.grade}年级${student.class}班`)
          teacherData.studentCount++
        }
      }
    })
    
    // 统计违纪次数和计算分数
    behaviors.value.forEach(behavior => {
      if (behavior.behavior_type && behavior.student_name && behavior.date) {
        const behaviorMonth = moment(behavior.date).format('YYYY-MM')
        // 找到该学生对应的教师
        const student = students.find(s => s.name === behavior.student_name)
        if (student && student.teacher) {
          const teacherData = teacherMap.value.get(student.teacher)
          if (teacherData) {
            // 初始化月度分数记录
            if (!teacherData.monthlyScores[behaviorMonth]) {
              teacherData.monthlyScores[behaviorMonth] = {
                score: 1000,
                scoreChange: 0,
                violationCount: 0
              }
            }
            
            // 统计违纪行为和分数变化
            const behaviorScore = behavior.behavior_score || 0
            teacherData.monthlyScores[behaviorMonth].scoreChange += behaviorScore
            if (behaviorScore < 0) {
              teacherData.monthlyScores[behaviorMonth].violationCount++
            }
          }
        }
      }
    })

    // 统计教师行为记录的分数
    teacherBehaviors.forEach(behavior => {
      if (behavior.teacher_name && behavior.date) {
        const behaviorMonth = moment(behavior.date).format('YYYY-MM')
        const teacherName = getTeacherNameFromClass(behavior.teacher_name)
        if (teacherName) {
          const teacherData = teacherMap.value.get(teacherName)
          if (teacherData) {
            // 初始化月度分数记录
            if (!teacherData.monthlyScores[behaviorMonth]) {
              teacherData.monthlyScores[behaviorMonth] = {
                score: 1000,
                scoreChange: 0,
                violationCount: 0
              }
            }
            
            // 更新分数变化
            teacherData.monthlyScores[behaviorMonth].scoreChange += behavior.score
            if (behavior.score < 0) {
              teacherData.monthlyScores[behaviorMonth].violationCount++
            }
          }
        }
      }
    })
    
    // 计算所选月份的最终分数
    teacherMap.value.forEach(teacher => {
      const monthlyScore = teacher.monthlyScores[selectedMonth.value] || {
        score: 1000,
        scoreChange: 0,
        violationCount: 0
      }
      teacher.score = Math.max(0, monthlyScore.score + monthlyScore.scoreChange)
      teacher.scoreChange = monthlyScore.scoreChange
      teacher.violationCount = monthlyScore.violationCount
    })
    
    // 转换为数组格式
    teachers.value = Array.from(teacherMap.value.values()).map(teacher => ({
      ...teacher,
      classes: Array.from(teacher.classes)
    }))
  } catch (error) {
    console.error('获取教师数据失败:', error)
    ElMessage.error('获取教师数据失败')
  } finally {
    loading.value = false
  }
}

// 从班级名称中提取教师姓名
const getTeacherNameFromClass = (className) => {
  // 从班级名称中提取年级和班级号（例如：高一1班 -> 高一、1）
  const match = className.match(/(高[一二三])(\d+)班/)
  if (!match) return null

  const [, grade, classNum] = match
  const classInfo = `${grade}年级${classNum}班`

  // 遍历 teacherMap 查找对应的教师
  for (const [teacherName, teacherData] of teacherMap.value.entries()) {
    if (teacherData.classes.has(classInfo)) {
      return teacherName
    }
  }
  return null
}

// 获取行为类型列表
const fetchBehaviorTypes = async () => {
  try {
    const response = await axios.get('/api/behaviorTypes')
    behaviorTypes.value = response.data
  } catch (error) {
    console.error('获取行为类型失败:', error)
    ElMessage.error('获取行为类型失败')
  }
}

// 排序状态
const sortState = ref({
  prop: '',
  order: ''
})

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  if (!prop) return
  
  sortState.value = { prop, order }
  
  const sortedTeachers = [...teachers.value]
  sortedTeachers.sort((a, b) => {
    const factor = order === 'ascending' ? 1 : -1
    
    switch (prop) {
      case 'score':
        return (a.score - b.score) * factor
      case 'studentCount':
        return (a.studentCount - b.studentCount) * factor
      case 'violationCount':
        return (a.violationCount - b.violationCount) * factor
      case 'name':
        return a.name.localeCompare(b.name) * factor
      default:
        return 0
    }
  })
  
  teachers.value = sortedTeachers
}

// 修改计算属性，保持排序状态
const filteredTeachers = computed(() => {
  let result = teachers.value
  
  // 应用搜索过滤
  if (searchQuery.value) {
    result = result.filter(teacher => 
      teacher.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  // 应用当前排序
  if (sortState.value.prop && sortState.value.order) {
    result = [...result].sort((a, b) => {
      const factor = sortState.value.order === 'ascending' ? 1 : -1
      
      switch (sortState.value.prop) {
        case 'score':
          return (a.score - b.score) * factor
        case 'studentCount':
          return (a.studentCount - b.studentCount) * factor
        case 'violationCount':
          return (a.violationCount - b.violationCount) * factor
        case 'name':
          return a.name.localeCompare(b.name) * factor
        default:
          return 0
      }
    })
  }
  
  return result
})

const paginatedTeachers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTeachers.value.slice(start, end)
})

// 事件处理
const handleSearch = () => {
  currentPage.value = 1
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 添加自动刷新函数
const startAutoRefresh = () => {
  // 清除现有的定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
  // 每30秒自动刷新一次
  refreshTimer.value = setInterval(fetchTeachers, 30000)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// 在组件挂载时启动自动刷新
onMounted(() => {
  fetchTeachers()
  startAutoRefresh()
})

// 在组件卸载时停止自动刷新
onUnmounted(() => {
  stopAutoRefresh()
})

// 监听月份变化
watch(selectedMonth, () => {
  fetchTeachers()
})
</script>

<style scoped>
.teachers-container {
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
  gap: 20px;
  align-items: center;
}

.filter-section {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 250px;
}

.table-container {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.class-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.score-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.base-score {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.current-score {
  font-weight: 600;
  font-size: 14px;
}

.current-score.positive {
  color: var(--el-color-success);
}

.current-score.negative {
  color: var(--el-color-danger);
}

.score-change {
  font-size: 12px;
}

.change {
  font-weight: 500;
}

.change.positive {
  color: var(--el-color-success);
}

.change.negative {
  color: var(--el-color-danger);
}
</style> 