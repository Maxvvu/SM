<template>
  <div class="students-container">
    <div class="header">
      <h2>学生管理</h2>
      <div class="header-right">
        <el-select v-model="filterGrade" placeholder="选择年级" clearable @change="handleFilter" style="margin-right: 10px">
          <el-option label="高一" value="高一" />
          <el-option label="高二" value="高二" />
          <el-option label="高三" value="高三" />
        </el-select>
        <el-button type="primary" @click="handleAdd">
          添加学生
        </el-button>
      </div>
    </div>

    <el-table 
      :data="filteredStudents" 
      style="width: 100%"
      v-loading="loading"
      element-loading-text="加载中..."
      @sort-change="handleSortChange"
    >
      <el-table-column prop="name" label="姓名" sortable="custom" />
      <el-table-column prop="student_id" label="学号" sortable="custom" />
      <el-table-column prop="grade" label="年级" sortable="custom">
        <template #default="scope">
          {{ scope.row.grade || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="class" label="班级" sortable="custom">
        <template #default="scope">
          {{ scope.row.class || '-' }}
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
          <el-tag :type="scope.row.violation_count > 0 ? 'danger' : ''">
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
          <el-tag :type="scope.row.excellent_count > 0 ? 'success' : ''">
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
import { User, Plus, Picture } from '@element-plus/icons-vue'

const students = ref([])
const dialogVisible = ref(false)
const loading = ref(false)
const filterGrade = ref('')
const sortBy = ref('')
const sortOrder = ref('')

const form = ref({
  name: '',
  student_id: '',
  class: '',
  grade: '',
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
  emergency_phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 过滤后的学生列表
const filteredStudents = computed(() => {
  let result = [...students.value]
  
  // 年级筛选
  if (filterGrade.value) {
    result = result.filter(student => student.grade === filterGrade.value)
  }
  
  // 排序
  if (sortBy.value && sortOrder.value) {
    result.sort((a, b) => {
      let aValue = a[sortBy.value] || 0
      let bValue = b[sortBy.value] || 0
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortOrder.value === 'ascending') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }
  
  return result
})

// 处理排序
const handleSortChange = ({ prop, order }) => {
  sortBy.value = prop
  sortOrder.value = order
}

// 处理筛选
const handleFilter = () => {
  // 筛选会自动通过计算属性处理
}

// 添加上传请求头
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}))

const handleAdd = () => {
  form.value = {
    name: '',
    student_id: '',
    class: '',
    grade: '',
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
    
    // 在构建submitData前检查表单数据
    console.log('表单完整数据:', {
      id: form.value.id,
      name: form.value.name,
      student_id: form.value.student_id,
      grade: form.value.grade,
      class: form.value.class,
      photo_url: form.value.photo_url,  // 明确列出photo_url
      address: form.value.address,
      emergency_contact: form.value.emergency_contact,
      emergency_phone: form.value.emergency_phone,
      notes: form.value.notes
    })
    
    const submitData = {
      name: form.value.name?.trim() || '',
      student_id: form.value.student_id?.trim() || '',
      grade: form.value.grade || '',
      class: form.value.class?.trim() || '',
      photo_url: form.value.photo_url || '',  // 确保不会是undefined
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
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
</style> 