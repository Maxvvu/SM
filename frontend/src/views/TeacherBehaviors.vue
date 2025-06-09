<template>
  <div class="teacher-behaviors-container">
    <div class="header">
      <h2>教师行为记录</h2>
      <div class="header-right">
        <div class="search-section">
          <el-input
            v-model="searchQuery"
            placeholder="搜索教师姓名或描述"
            clearable
            @input="handleSearch"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="dateShortcuts"
            value-format="YYYY-MM-DD"
            @change="handleFilter"
            class="date-picker"
          />
        </div>
        <el-button type="primary" @click="handleAdd">
          添加记录
        </el-button>
      </div>
    </div>

    <div class="table-container">
      <el-table 
        :data="paginatedBehaviors" 
        style="width: 100%"
        v-loading="loading"
        :header-cell-style="{ background: 'var(--el-color-primary-light-9)', color: 'var(--el-text-color-primary)' }"
        ref="tableRef"
      >
        <el-table-column prop="teacher_name" label="教师姓名" sortable />
        <el-table-column prop="behavior_type" label="行为类型" width="150">
          <template #default="scope">
            <el-tag :type="getBehaviorTagType(scope.row.behavior_type)">
              {{ scope.row.behavior_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="分数" width="100">
          <template #default="scope">
            <span :class="{ 'positive-score': scope.row.score > 0, 'negative-score': scope.row.score < 0 }">
              {{ scope.row.score > 0 ? '+' : ''}}{{ scope.row.score }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="process_result" label="处理结果" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-if="scope.row.process_result" type="info" effect="plain">
              {{ scope.row.process_result }}
            </el-tag>
            <span v-else class="no-result">未处理</span>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="记录时间" sortable width="180">
          <template #default="scope">
            {{ formatDate(scope.row.date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="left">
          <template #default="scope">
            <div class="button-group">
              <el-button
                size="small"
                type="primary"
                @click="handleEdit(scope.row)"
              >修改</el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDelete(scope.row)"
              >删除</el-button>
              <el-button
                size="small"
                type="info"
                @click="handleDetail(scope.row)"
              >详情</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredBehaviors.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑行为记录' : '添加行为记录'"
      width="600px"
    >
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="教师" prop="teacher_name">
          <el-select 
            v-model="form.teacher_name" 
            placeholder="请选择教师"
            filterable
            style="width: 100%"
            :disabled="!!form.id"
          >
            <el-option
              v-for="teacher in teachers"
              :key="teacher.name"
              :label="teacher.name"
              :value="teacher.name"
            >
              <span>{{ teacher.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ teacher.classes.join('、') }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="行为类型" prop="behavior_type">
          <el-select 
            v-model="form.behavior_type" 
            placeholder="请选择行为类型"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="type in behaviorTypes"
              :key="type"
              :label="type"
              :value="type"
            >
              <span>{{ type }}</span>
              <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                {{ getScoreByType(type) }}分
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="时间" prop="date">
          <el-date-picker
            v-model="form.date"
            type="datetime"
            placeholder="选择日期时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入具体描述"
          />
        </el-form-item>
        <el-form-item label="处理结果" prop="process_result">
          <el-input
            v-model="form.process_result"
            type="textarea"
            :rows="2"
            placeholder="请输入处理结果"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="行为记录详情"
      width="600px"
      class="behavior-detail-dialog"
    >
      <div class="detail-content" v-if="selectedBehavior">
        <div class="detail-header">
          <div class="teacher-info">
            <h3>{{ selectedBehavior.teacher_name }}</h3>
            <div class="score-info" :class="{ 'positive-score': selectedBehavior.score > 0, 'negative-score': selectedBehavior.score < 0 }">
              {{ selectedBehavior.score > 0 ? '+' : '' }}{{ selectedBehavior.score }}分
            </div>
          </div>
          <div class="behavior-type">
            <el-tag :type="getBehaviorTagType(selectedBehavior.behavior_type)" size="large">
              {{ selectedBehavior.behavior_type }}
            </el-tag>
          </div>
        </div>

        <el-divider />

        <div class="detail-body">
          <div class="detail-item description">
            <label>行为描述</label>
            <p>{{ selectedBehavior.description }}</p>
          </div>
          
          <div class="detail-item process-result">
            <label>处理结果</label>
            <p v-if="selectedBehavior.process_result">{{ selectedBehavior.process_result }}</p>
            <p v-else class="no-result">暂未处理</p>
          </div>

          <div class="detail-item">
            <label>记录时间</label>
            <p>{{ formatDate(selectedBehavior.date) }}</p>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import axios from 'axios'
import moment from 'moment'

// 状态变量
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const searchQuery = ref('')
const dateRange = ref(null)
const behaviors = ref([])
const teachers = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const selectedBehavior = ref(null)
const formRef = ref(null)

// 行为类型列表（从加减分项获取）
const behaviorTypes = ref([])
const scoreItemsMap = ref(new Map())

// 获取行为类型列表
const fetchBehaviorTypes = async () => {
  try {
    const response = await axios.get('/api/score-items')
    // 获取所有加减分项
    const items = response.data
    behaviorTypes.value = items.map(item => item.name)
    
    // 更新分数映射
    scoreItemsMap.value = new Map(
      items.map(item => [item.name, item.score])
    )
  } catch (error) {
    console.error('获取行为类型列表失败:', error)
    ElMessage.error('获取行为类型列表失败')
  }
}

// 获取行为类型对应的分数
const getScoreByType = (type) => {
  return scoreItemsMap.value.get(type) || 0
}

// 获取行为类型对应的标签类型
const getBehaviorTagType = (type) => {
  const score = getScoreByType(type)
  return score >= 0 ? 'success' : 'danger'
}

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

// 表单数据
const form = ref({
  id: null,
  teacher_name: '',
  behavior_type: '',
  description: '',
  date: '',
  process_result: '',
  score: 0
})

// 表单验证规则
const rules = {
  teacher_name: [
    { required: true, message: '请选择教师', trigger: 'change' }
  ],
  behavior_type: [
    { required: true, message: '请选择行为类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' },
    { max: 200, message: '最多输入200个字符', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择时间', trigger: 'change' },
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请选择时间'))
        } else {
          const selectedDate = new Date(value)
          const now = new Date()
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(now.getFullYear() - 1)
          
          if (selectedDate > now) {
            callback(new Error('不能选择未来时间'))
          } else if (selectedDate < oneYearAgo) {
            callback(new Error('不能选择超过一年前的时间'))
          } else {
            callback()
          }
        }
      },
      trigger: 'change'
    }
  ]
}

// 过滤后的数据
const filteredBehaviors = computed(() => {
  let result = [...behaviors.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(behavior => 
      behavior.teacher_name.toLowerCase().includes(query) || 
      behavior.description.toLowerCase().includes(query)
    )
  }
  
  // 日期范围过滤
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const startDate = new Date(dateRange.value[0])
    const endDate = new Date(dateRange.value[1])
    endDate.setHours(23, 59, 59, 999)
    
    result = result.filter(behavior => {
      const behaviorDate = new Date(behavior.date)
      return behaviorDate >= startDate && behaviorDate <= endDate
    })
  }
  
  return result
})

// 分页数据
const paginatedBehaviors = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredBehaviors.value.slice(start, start + pageSize.value)
})

// 获取教师行为记录列表
const fetchBehaviors = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/teacher-behaviors')
    behaviors.value = response.data.map(behavior => ({
      ...behavior,
      date: moment(behavior.date).format('YYYY-MM-DD HH:mm:ss')
    }))
  } catch (error) {
    console.error('获取教师行为记录失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 获取教师列表
const fetchTeachers = async () => {
  try {
    // 从学生信息中获取班主任数据
    const response = await axios.get('/api/students')
    const students = response.data
    
    // 提取所有不重复的教师名称
    const teacherSet = new Set()
    students.forEach(student => {
      if (student.teacher) {
        teacherSet.add(student.teacher)
      }
    })
    
    // 转换为教师列表
    teachers.value = Array.from(teacherSet).map(name => ({
      name,
      classes: students
        .filter(s => s.teacher === name)
        .map(s => `${s.grade}${s.class}班`)
        .filter((value, index, self) => self.indexOf(value) === index) // 去重
    }))
  } catch (error) {
    console.error('获取教师列表失败:', error)
    ElMessage.error('获取教师列表失败')
  }
}

// 事件处理函数
const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  currentPage.value = 1
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

const handleAdd = () => {
  form.value = {
    id: null,
    teacher_name: '',
    behavior_type: '',
    description: '',
    date: '',
    process_result: '',
    score: 0
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这条记录吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await axios.delete(`/api/teacher-behaviors/${row.id}`)
        ElMessage.success('删除成功')
        await fetchBehaviors()
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

const handleDetail = (row) => {
  selectedBehavior.value = { ...row }
  detailDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) {
    console.error('表单引用不存在');
    return;
  }

  try {
    await formRef.value.validate()
    
    submitting.value = true
    const submitData = {
      ...form.value,
      date: form.value.date ? moment(form.value.date).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss'),
      score: getScoreByType(form.value.behavior_type) || 0
    };

    if (form.value.id) {
      // 编辑
      await axios.put(`/api/teacher-behaviors/${form.value.id}`, submitData)
      ElMessage.success('更新成功')
    } else {
      // 新增
      await axios.post('/api/teacher-behaviors', submitData)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchBehaviors()
  } catch (error) {
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      console.error('操作失败:', error)
      ElMessage.error('操作失败')
    }
  } finally {
    submitting.value = false
  }
}

const formatDate = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

// 生命周期钩子
onMounted(async () => {
  await Promise.all([
    fetchBehaviors(),
    fetchTeachers(),
    fetchBehaviorTypes()
  ])
})
</script>

<style scoped>
.teacher-behaviors-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.header {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 20px;
  align-items: center;
}

.search-section {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 250px;
}

.date-picker {
  width: 320px;
}

.table-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.button-group {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.teacher-info h3 {
  margin: 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.detail-body {
  .detail-item {
    margin-bottom: 16px;
    
    label {
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
      display: block;
    }
    
    p {
      margin: 0;
      line-height: 1.6;
      color: var(--el-text-color-primary);
    }
  }
}

.no-result {
  color: var(--el-text-color-secondary);
}

.positive-score {
  color: #67c23a;
  font-weight: bold;
}

.negative-score {
  color: #f56c6c;
  font-weight: bold;
}

.score-info {
  margin-top: 8px;
  font-size: 16px;
}

@media screen and (max-width: 768px) {
  .teacher-behaviors-container {
    padding: 16px;
  }
  
  .header {
    padding: 16px;
    flex-direction: column;
    gap: 16px;
  }
  
  .header-right {
    width: 100%;
    flex-direction: column;
  }
  
  .search-section {
    width: 100%;
    flex-direction: column;
  }
  
  .search-input,
  .date-picker {
    width: 100%;
  }
  
  .button-group {
    flex-wrap: wrap;
  }
}
</style>