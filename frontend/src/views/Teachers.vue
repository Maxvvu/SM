<template>
  <div class="teachers-container">
    <div class="header">
      <h2>教师管理</h2>
      <div class="header-right">
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
        <div class="action-group">
          <el-button type="primary" @click="handleAdd">
            添加教师
          </el-button>
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
        <el-table-column prop="studentCount" label="学生数量" sortable="custom" />
        <el-table-column prop="violationCount" label="违纪总数" sortable="custom">
          <template #default="scope">
            <el-tag :type="scope.row.violationCount > 0 ? 'danger' : 'info'" size="small">
              {{ scope.row.violationCount }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              @click="handleEdit(scope.row)"
            >编辑</el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(scope.row)"
            >删除</el-button>
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

    <!-- 添加/编辑教师对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form :model="teacherForm" label-width="100px">
        <el-form-item label="姓名">
          <el-input v-model="teacherForm.name" />
        </el-form-item>
        <el-form-item label="管理班级">
          <el-select
            v-model="teacherForm.classes"
            multiple
            placeholder="请选择管理班级"
          >
            <el-option
              v-for="grade in grades"
              :key="grade"
              :label="grade"
              :value="grade"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, User } from '@element-plus/icons-vue'
import axios from 'axios'

// 状态变量
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const teachers = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const teacherForm = ref({
  name: '',
  classes: []
})
const behaviors = ref([])

// 从行为管理中获取违纪信息
const fetchBehaviors = async () => {
  try {
    const response = await axios.get('/api/behaviors')
    behaviors.value = response.data
  } catch (error) {
    console.error('获取行为记录失败:', error)
    ElMessage.error('获取行为记录失败')
  }
}

// 从学生数据中获取教师信息
const fetchTeachers = async () => {
  loading.value = true
  try {
    const [studentsResponse, behaviorsResponse] = await Promise.all([
      axios.get('/api/students'),
      axios.get('/api/behaviors')
    ])
    
    const students = studentsResponse.data
    behaviors.value = behaviorsResponse.data
    
    // 提取所有不重复的教师信息
    const teacherMap = new Map()
    students.forEach(student => {
      if (student.teacher) {
        if (!teacherMap.has(student.teacher)) {
          teacherMap.set(student.teacher, {
            name: student.teacher,
            classes: new Set([`${student.grade}年级${student.class}班`]),
            studentCount: 1,
            violationCount: 0
          })
        } else {
          const teacherData = teacherMap.get(student.teacher)
          teacherData.classes.add(`${student.grade}年级${student.class}班`)
          teacherData.studentCount++
        }
      }
    })
    
    // 统计违纪次数
    behaviors.value.forEach(behavior => {
      if (behavior.behavior_type && behavior.student_name) {
        // 找到该学生对应的教师
        const student = students.find(s => s.name === behavior.student_name)
        if (student && student.teacher) {
          const teacherData = teacherMap.get(student.teacher)
          if (teacherData) {
            // 只统计违纪行为
            const behaviorType = behaviorTypes.value.find(t => t.name === behavior.behavior_type)
            if (behaviorType && behaviorType.category === '违纪') {
              teacherData.violationCount++
            }
          }
        }
      }
    })
    
    // 转换为数组格式
    teachers.value = Array.from(teacherMap.values()).map(teacher => ({
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

// 获取行为类型列表
const behaviorTypes = ref([])
const fetchBehaviorTypes = async () => {
  try {
    const response = await axios.get('/api/behaviorTypes')
    behaviorTypes.value = response.data
  } catch (error) {
    console.error('获取行为类型失败:', error)
    ElMessage.error('获取行为类型失败')
  }
}

// 计算属性
const filteredTeachers = computed(() => {
  if (!searchQuery.value) return teachers.value
  return teachers.value.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
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

const handleSortChange = ({ prop, order }) => {
  if (!prop) return
  
  teachers.value.sort((a, b) => {
    const factor = order === 'ascending' ? 1 : -1
    if (prop === 'studentCount' || prop === 'violationCount') {
      return (a[prop] - b[prop]) * factor
    }
    return a[prop].localeCompare(b[prop]) * factor
  })
}

const handleAdd = () => {
  dialogTitle.value = '添加教师'
  teacherForm.value = {
    name: '',
    classes: []
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑教师'
  teacherForm.value = {
    name: row.name,
    classes: [...row.classes]
  }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除教师 ${row.name} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    const index = teachers.value.findIndex(t => t.name === row.name)
    if (index > -1) {
      teachers.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

const handleSave = () => {
  if (!teacherForm.value.name.trim()) {
    ElMessage.warning('请输入教师姓名')
    return
  }
  
  const index = teachers.value.findIndex(t => t.name === teacherForm.value.name)
  if (index > -1) {
    teachers.value[index] = {
      ...teachers.value[index],
      ...teacherForm.value
    }
  } else {
    teachers.value.push({
      ...teacherForm.value,
      studentCount: 0,
      violationCount: 0
    })
  }
  
  dialogVisible.value = false
  ElMessage.success(dialogTitle.value === '添加教师' ? '添加成功' : '更新成功')
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 生命周期钩子
onMounted(async () => {
  await fetchBehaviorTypes()
  await fetchTeachers()
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
</style> 