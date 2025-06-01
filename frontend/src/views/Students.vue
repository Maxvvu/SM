<template>
  <div class="students-container">
    <div class="header">
      <h2>学生管理</h2>
      <div class="header-right">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索姓名或学号"
            clearable
            @input="handleSearch"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="filter-group">
          <el-select
            v-model="filterGrade"
            placeholder="选择年级"
            clearable
            @change="handleFilter"
            class="filter-item"
          >
            <el-option
              v-for="grade in grades"
              :key="grade"
              :label="grade"
              :value="grade"
            >
              <el-tag
                :type="getGradeTagType(grade)"
                size="small"
                class="grade-tag"
              >
                {{ grade }}
              </el-tag>
            </el-option>
          </el-select>

          <el-select
            v-model="filterClass"
            placeholder="选择班级"
            clearable
            @change="handleFilter"
            class="filter-item"
          >
            <el-option
              v-for="classNum in availableClasses"
              :key="classNum"
              :label="`${classNum}班`"
              :value="classNum"
            />
          </el-select>
        </div>
        <div class="action-group">
          <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedStudents.length">
            批量删除
          </el-button>
          <el-button type="primary" @click="handleAdd">
            添加学生
          </el-button>
        </div>
      </div>
    </div>

    <div class="table-container">
      <el-table 
        :data="paginatedStudents" 
        style="width: 100%"
        v-loading="loading"
        element-loading-text="加载中..."
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" sortable="custom" />
        <el-table-column prop="student_id" label="学号" sortable="custom" />
        <el-table-column prop="grade" label="年级" sortable="custom">
          <template #default="scope">
            <el-tag
              :type="getGradeTagType(scope.row.grade)"
              size="small"
            >
              {{ scope.row.grade || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="class" label="班级" sortable="custom">
          <template #default="scope">
            <el-tag
              type="info"
              size="small"
              effect="plain"
            >
              {{ scope.row.class ? `${scope.row.class}班` : '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="teacher" label="班主任" sortable="custom">
          <template #default="scope">
            <el-tag
              type="info"
              size="small"
              effect="plain"
            >
              {{ scope.row.teacher || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="照片" width="100">
          <template #default="scope">
            <div class="image-container">
              <el-image
                v-if="scope.row.photo_url"
                :src="getImageUrl(scope.row.photo_url)"
                :preview-src-list="[getImageUrl(scope.row.photo_url)]"
                :initial-index="0"
                fit="cover"
                class="student-photo"
                preview-teleported
                hide-on-click-modal
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <el-icon v-else><User /></el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          prop="violation_count" 
          label="违纪次数" 
          sortable="custom"
          width="100"
          :sort-orders="['ascending', 'descending']"
        >
          <template #default="scope">
            <el-tag :type="scope.row.violation_count > 0 ? 'danger' : 'info'">
              {{ scope.row.violation_count || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          prop="excellent_count" 
          label="优秀表现" 
          sortable="custom"
          width="100"
          :sort-orders="['ascending', 'descending']"
        >
          <template #default="scope">
            <el-tag :type="scope.row.excellent_count > 0 ? 'success' : 'info'">
              {{ scope.row.excellent_count || 0 }}
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
          :total="filteredStudents.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑学生' : '添加学生'"
      width="600px"
    >
      <el-form 
        ref="formRef"
        :model="form" 
        :rules="rules"
        label-width="100px"
        status-icon
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学号" prop="student_id">
              <el-input v-model="form.student_id" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年级" prop="grade">
              <el-select v-model="form.grade" placeholder="请选择年级" style="width: 100%">
                <el-option label="高一" value="高一" />
                <el-option label="高二" value="高二" />
                <el-option label="高三" value="高三" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班级" prop="class">
              <el-input v-model="form.class" placeholder="请输入班级" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="班主任" prop="teacher">
              <el-input v-model="form.teacher" placeholder="请输入班主任姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="照片">
          <el-upload
            class="avatar-uploader"
            action="/api/upload?type=students"
            :show-file-list="false"
            :on-success="handlePhotoSuccess"
            :on-error="handlePhotoError"
            :before-upload="beforePhotoUpload"
            :headers="uploadHeaders"
            name="file"
            accept="image/jpeg,image/png,image/gif"
          >
            <img v-if="form.photo_url" :src="getImageUrl(form.photo_url)" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="el-upload__tip">
            支持 jpg/png/gif 文件，且不超过 2MB
          </div>
        </el-form-item>

        <el-form-item label="家庭住址">
          <el-input v-model="form.address" type="textarea" :rows="2" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="紧急联系人" prop="emergency_contact">
              <el-input v-model="form.emergency_contact" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人电话" prop="emergency_phone">
              <el-input v-model="form.emergency_phone" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            {{ form.id ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Plus, Picture, Search } from '@element-plus/icons-vue'

const students = ref([])
const dialogVisible = ref(false)
const loading = ref(false)
const filterGrade = ref('')
const filterClass = ref('')
const sortBy = ref('')
const sortOrder = ref('')
const searchQuery = ref('')

const form = ref({
  name: '',
  student_id: '',
  class: '',
  grade: '',
  teacher: '',
  photo_url: '',
  address: '',
  emergency_contact: '',
  emergency_phone: '',
  notes: ''
})

const formRef = ref(null)

const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  student_id: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9]+$/, message: '学号只能包含字母和数字', trigger: 'blur' }
  ],
  grade: [
    { required: true, message: '请选择年级', trigger: 'change' }
  ],
  class: [
    { required: true, message: '请输入班级', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入班级'))
        } else {
          // 移除可能存在的"班"字后验证
          const classValue = value.trim().replace(/班$/, '')
          if (!classValue) {
            callback(new Error('班级不能为空'))
          } else if (classValue.length > 10) {
            callback(new Error('班级名称不能超过10个字符'))
          } else if (/^[1-9][0-9]?$/.test(classValue)) {
            // 如果是1-99的数字，直接通过
            callback()
          } else if (/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(classValue)) {
            // 如果包含中文、字母、数字的组合，通过
            callback()
          } else {
            callback(new Error('班级只能包含中文、字母和数字'))
          }
        }
      },
      trigger: 'blur'
    }
  ],
  teacher: [
    { required: true, message: '请输入班主任姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  emergency_phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 预定义年级列表
const grades = ['高一', '高二', '高三']

// 获取可用的班级列表
const availableClasses = computed(() => {
  const classSet = new Set()
  students.value.forEach(student => {
    if (student.class && (!filterGrade.value || student.grade === filterGrade.value)) {
      // 移除末尾的"班"字（如果有）
      const className = student.class.replace(/班$/, '')
      if (className) {
        classSet.add(className)
      }
    }
  })
  return Array.from(classSet).sort((a, b) => {
    // 如果都是数字，按数字大小排序
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
      return parseInt(a) - parseInt(b)
    }
    // 否则按字符串排序
    return a.localeCompare(b, 'zh-CN')
  })
})

// 根据年级获取标签类型
const getGradeTagType = (grade) => {
  switch (grade) {
    case '高一':
      return 'success'
    case '高二':
      return 'warning'
    case '高三':
      return 'danger'
    default:
      return 'info'
  }
}

// 添加分页相关的响应式变量
const currentPage = ref(1)
const pageSize = ref(10)

// 修改过滤后的学生列表计算属性
const filteredStudents = computed(() => {
  let result = [...students.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(student => 
      student.name.toLowerCase().includes(query) || 
      student.student_id.toString().includes(query)
    )
  }
  
  // 年级过滤
  if (filterGrade.value) {
    result = result.filter(student => student.grade === filterGrade.value)
  }
  
  // 班级过滤
  if (filterClass.value) {
    result = result.filter(student => student.class === filterClass.value)
  }

  // 排序处理
  if (sortBy.value && sortOrder.value) {
    const order = sortOrder.value === 'ascending' ? 1 : -1
    result.sort((a, b) => {
      if (sortBy.value === 'violation_count' || sortBy.value === 'excellent_count') {
        return (a[sortBy.value] || 0) > (b[sortBy.value] || 0) ? order : -order
      }
      return a[sortBy.value] > b[sortBy.value] ? order : -order
    })
  }
  
  return result
})

// 添加分页数据计算属性
const paginatedStudents = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filteredStudents.value.slice(startIndex, startIndex + pageSize.value)
})

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 处理每页显示数量变化
const handleSizeChange = (val) => {
  pageSize.value = val
  // 重置到第一页
  currentPage.value = 1
}

// 修改筛选和搜索处理函数，添加重置页码逻辑
const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  // 如果切换年级，清空班级筛选
  if (filterGrade.value === '') {
    filterClass.value = ''
  }
  // 重置页码
  currentPage.value = 1
}

// 修改排序处理函数，添加重置页码逻辑
const handleSortChange = ({ prop, order }) => {
  sortBy.value = prop
  sortOrder.value = order
  // 重置页码
  currentPage.value = 1
}

const handleAdd = () => {
  form.value = {
    name: '',
    student_id: '',
    class: '',
    grade: '',
    teacher: '',
    photo_url: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    notes: ''
  }
  dialogVisible.value = true
}

const fetchStudents = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/students')
    if (response && response.data) {
      console.log('获取到的学生列表:', response.data)
      students.value = response.data
    } else {
      console.warn('获取学生列表响应异常:', response)
    }
  } catch (error) {
    console.error('获取学生列表失败:', error)
    ElMessage.error('获取学生列表失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (row) => {
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这个学生吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        loading.value = true
        await axios.delete(`/api/students/${row.id}`)
        ElMessage.success('删除成功')
        await fetchStudents()
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      } finally {
        loading.value = false
      }
    })
    .catch(() => {})
}

const getImageUrl = (url) => {
  if (!url) return ''
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http')) {
    return url
  }
  
  // 如果以/uploads开头，直接返回完整路径
  if (url.startsWith('/uploads/')) {
    return url
  }
  
  // 如果不以/开头，添加/uploads/students/
  if (!url.startsWith('/')) {
    return `/uploads/students/${url}`
  }
  
  return url
}

const handlePhotoSuccess = (response) => {
  console.log('照片上传成功，完整响应数据:', response)
  
  if (response.url) {
    // 确保在设置前form.value存在
    if (!form.value) {
      form.value = {}
    }
    
    console.log('设置photo_url前的完整表单数据:', { ...form.value })
    form.value.photo_url = response.url
    console.log('设置photo_url后的完整表单数据:', { ...form.value })
    console.log('photo_url的值和类型:', {
      value: form.value.photo_url,
      type: typeof form.value.photo_url
    })
    
    ElMessage.success('照片上传成功')
  } else {
    console.error('无效的响应格式:', response)
    ElMessage.error('照片上传失败：服务器返回的数据格式不正确')
  }
}

const handlePhotoError = () => {
  ElMessage.error('照片上传失败')
}

const beforePhotoUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    // 处理班级数据，移除末尾的"班"字（如果有）
    const classValue = form.value.class?.trim().replace(/班$/, '')
    
    const submitData = {
      name: form.value.name?.trim() || '',
      student_id: form.value.student_id?.trim() || '',
      grade: form.value.grade || '',
      class: classValue,  // 使用处理后的班级值
      teacher: form.value.teacher?.trim() || '',
      photo_url: form.value.photo_url || '',
      address: form.value.address?.trim() || '',
      emergency_contact: form.value.emergency_contact?.trim() || '',
      emergency_phone: form.value.emergency_phone?.trim() || '',
      notes: form.value.notes?.trim() || ''
    }

    // 打印完整的提交数据
    console.log('完整的提交数据:', submitData)
    console.log('photo_url的值:', submitData.photo_url)
    console.log('photo_url的类型:', typeof submitData.photo_url)

    let response
    if (form.value.id) {
      console.log('执行更新操作，ID:', form.value.id)
      // 直接使用JSON.stringify确保数据正确传输
      const requestData = JSON.stringify(submitData)
      console.log('发送到服务器的原始数据:', requestData)
      
      response = await axios.put(`/api/students/${form.value.id}`, submitData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('更新响应数据:', JSON.stringify(response.data, null, 2))
    } else {
      console.log('执行添加操作')
      response = await axios.post('/api/students', submitData)
      console.log('添加响应数据:', JSON.stringify(response.data, null, 2))
    }
    
    if (response && response.data) {
      if (!form.value.id) {
        students.value.unshift(response.data)
      } else {
        const index = students.value.findIndex(item => item.id === form.value.id)
        if (index !== -1) {
          students.value[index] = response.data
        }
      }
      
      ElMessage.success(form.value.id ? '更新成功' : '添加成功')
      dialogVisible.value = false
      
      // 重置表单前保存当前数据
      const currentData = { ...form.value }
      console.log('重置表单前的完整数据:', currentData)
      
      // 重置表单
      formRef.value.resetFields()
      form.value = {
        id: null,
        name: '',
        student_id: '',
        class: '',
        grade: '',
        teacher: '',
        photo_url: '',
        address: '',
        emergency_contact: '',
        emergency_phone: '',
        notes: ''
      }
      
      console.log('重置表单后的完整数据:', form.value)
    }
  } catch (error) {
    console.error('提交失败:', error)
    console.error('错误详情:', {
      formData: form.value,
      submitData,
      error: error.message,
      response: error.response?.data
    })
    
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error(form.value.id ? '更新失败' : '添加失败')
    }
  } finally {
    loading.value = false
  }
}

// 添加选中学生数组
const selectedStudents = ref([])

// 添加uploadHeaders定义
const uploadHeaders = computed(() => {
  return {
    'Authorization': `Bearer ${localStorage.getItem('token')}` // 从localStorage获取token
  }
})

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedStudents.value = selection
}

// 处理批量删除
const handleBatchDelete = () => {
  if (!selectedStudents.value.length) return
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedStudents.value.length} 名学生吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        loading.value = true
        // 创建删除请求的Promise数组
        const deletePromises = selectedStudents.value.map(student => 
          axios.delete(`/api/students/${student.id}`)
        )
        
        // 等待所有删除请求完成
        await Promise.all(deletePromises)
        
        ElMessage.success('批量删除成功')
        // 重新获取学生列表
        await fetchStudents()
      } catch (error) {
        console.error('批量删除失败:', error)
        ElMessage.error('批量删除失败')
      } finally {
        loading.value = false
      }
    })
    .catch(() => {
      // 用户取消删除操作
    })
}

onMounted(() => {
  fetchStudents()
})
</script>

<style scoped>
.students-container {
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
  gap: 16px;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.el-input__prefix) {
  color: var(--el-text-color-secondary);
  margin-right: 4px;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-item {
  min-width: 120px;
}

.action-group {
  display: flex;
  gap: 12px;
}

.grade-tag {
  width: 100%;
  text-align: center;
}

/* 确保表格内的标签居中显示 */
.el-table .el-tag {
  display: inline-flex;
  justify-content: center;
  min-width: 60px;
}

.el-button + .el-button {
  margin-left: 0;
}

.avatar-uploader {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader:hover {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}

.avatar {
  width: 100px;
  height: 100px;
  display: block;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 50px;
}

.student-photo {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  object-fit: cover;
  cursor: pointer;
  transition: all 0.3s;
}

.student-photo:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.image-error {
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  color: #909399;
}

/* 添加全局样式 */
:deep(.el-image-viewer__wrapper) {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2000;
}

:deep(.el-image-viewer__btn) {
  opacity: 0.8;
  background-color: rgba(0, 0, 0, 0.3);
}

:deep(.el-image-viewer__close) {
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  font-size: 24px;
}

:deep(.el-image-viewer__canvas) {
  user-select: none;
}

:deep(.el-image-viewer__img) {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.table-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 10px 0;
}

:deep(.el-pagination) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0;
}

:deep(.el-pagination .el-select .el-input) {
  width: 120px;
}

:deep(.el-pagination .el-pagination__total) {
  margin-right: 16px;
}

:deep(.el-pagination .el-pagination__sizes) {
  margin-right: 16px;
}

:deep(.el-pagination button) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: none;
  transition: all 0.3s ease;
}

:deep(.el-pagination button:hover) {
  background-color: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
}

:deep(.el-pagination .el-pager li) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: none;
  transition: all 0.3s ease;
}

:deep(.el-pagination .el-pager li:hover) {
  background-color: var(--el-color-primary-light-7);
}

:deep(.el-pagination .el-pager li.active) {
  background-color: var(--el-color-primary);
  color: white;
}

@media screen and (max-width: 768px) {
  .pagination-container {
    justify-content: center;
  }
  
  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
}
</style> 