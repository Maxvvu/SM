<template>
  <div class="behaviors-container">
    <div class="header">
      <h2>行为记录管理</h2>
      <div class="header-right">
        <el-select v-model="filterGrade" placeholder="选择年级" clearable @change="handleFilter" style="margin-right: 10px">
          <el-option label="高一" value="高一" />
          <el-option label="高二" value="高二" />
          <el-option label="高三" value="高三" />
        </el-select>
        <el-select v-model="filterType" placeholder="行为类型" clearable @change="handleFilter" style="margin-right: 10px">
          <el-option-group label="违纪行为">
            <el-option
              v-for="type in behaviorTypes.filter(t => t.category === '违纪')"
              :key="type.id"
              :label="type.name"
              :value="type.name"
            />
          </el-option-group>
          <el-option-group label="优秀表现">
            <el-option
              v-for="type in behaviorTypes.filter(t => t.category === '优秀')"
              :key="type.id"
              :label="type.name"
              :value="type.name"
            />
          </el-option-group>
        </el-select>
        <el-button type="primary" @click="handleAdd">
          添加记录
        </el-button>
      </div>
    </div>

    <el-table 
      :data="filteredBehaviors" 
      style="width: 100%"
      v-loading="loading"
    >
      <el-table-column prop="student_name" label="学生姓名" sortable />
      <el-table-column prop="grade" label="年级" sortable width="100" />
      <el-table-column prop="class" label="班级" sortable width="100" />
      <el-table-column prop="behavior_type" label="行为类型" width="120">
        <template #default="scope">
          <el-tag :type="getBehaviorType(scope.row.behavior_type)">
            {{ scope.row.behavior_type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
      <el-table-column label="图片" width="100">
        <template #default="scope">
          <div class="image-container">
            <div v-if="scope.row.image_url" class="image-preview">
              <el-image
                :src="getImageUrl(scope.row.image_url)"
                :preview-src-list="[getImageUrl(scope.row.image_url)]"
                preview-teleported
                :initial-index="0"
                fit="cover"
                :hide-on-click-modal="false"
                class="behavior-image-thumb"
                @load="handleImageLoad(scope.row)"
                @error="handleImageLoadError(scope.row)"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
                <template #placeholder>
                  <div class="image-loading">
                    <el-icon><Loading /></el-icon>
                    <span>加载中</span>
                  </div>
                </template>
              </el-image>
            </div>
            <span v-else class="no-image">无图片</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="记录时间" sortable width="180">
        <template #default="scope">
          {{ new Date(scope.row.date).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="scope">
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
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/修改行为记录对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '修改行为记录' : '添加行为记录'"
      width="600px"
    >
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="学生" prop="student_id">
          <el-select 
            v-model="form.student_id" 
            placeholder="请选择学生"
            filterable
            style="width: 100%"
            :disabled="!!form.id"
          >
            <el-option
              v-for="student in students"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            >
              <span>{{ student.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ student.grade }} {{ student.class }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="行为类型" prop="behavior_type">
          <el-select 
            v-model="form.behavior_type" 
            placeholder="请选择行为类型"
            style="width: 100%"
          >
            <el-option-group label="违纪行为">
              <el-option
                v-for="type in behaviorTypes.filter(t => t.category === '违纪')"
                :key="type.id"
                :label="type.name"
                :value="type.name"
              />
            </el-option-group>
            <el-option-group label="优秀表现">
              <el-option
                v-for="type in behaviorTypes.filter(t => t.category === '优秀')"
                :key="type.id"
                :label="type.name"
                :value="type.name"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="时间" prop="date">
          <el-date-picker
            v-model="form.date"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="new Date(2000, 1, 1, 0, 0, 0)"
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
        <el-form-item label="图片">
          <el-upload
            class="behavior-image-uploader"
            action="/api/upload"
            name="file"
            :data="{ type: 'behavior' }"
            :show-file-list="false"
            :before-upload="beforeImageUpload"
            :headers="uploadHeaders"
            :on-success="handleImageSuccess"
            :on-error="handleImageError"
            accept="image/jpeg,image/png,image/gif"
          >
            <img v-if="form.image_url" :src="getImageUrl(form.image_url)" class="behavior-image" />
            <el-icon v-else class="behavior-image-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="el-upload__tip">
            支持 jpg/png/gif 文件，且不超过 2MB
          </div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Picture, Loading } from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const behaviors = ref([])
const students = ref([])
const behaviorTypes = ref([])
const filterGrade = ref('')
const filterType = ref('')
const formRef = ref(null)

const form = ref({
  id: null,
  student_id: '',
  behavior_type: '',
  description: '',
  date: new Date().toISOString(),
  image_url: ''
})

const rules = {
  student_id: [
    { required: true, message: '请选择学生', trigger: 'change' }
  ],
  behavior_type: [
    { required: true, message: '请选择行为类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' },
    { max: 200, message: '最多输入200个字符', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择时间', trigger: 'change' }
  ]
}

// 过滤后的行为记录
const filteredBehaviors = computed(() => {
  let result = [...behaviors.value]
  
  // 年级筛选
  if (filterGrade.value) {
    result = result.filter(behavior => {
      const student = students.value.find(s => s.id === behavior.student_id)
      return student && student.grade === filterGrade.value
    })
  }

  // 行为类型筛选
  if (filterType.value) {
    result = result.filter(behavior => behavior.behavior_type === filterType.value)
  }
  
  return result
})

// 获取行为记录列表
const fetchBehaviors = async () => {
  try {
    loading.value = true
    console.log('正在获取行为记录列表...')
    
    const response = await axios.get('/api/behaviors')
    console.log('获取列表响应:', response)
    
    if (!response || !response.data) {
      throw new Error('获取数据失败：服务器响应异常')
    }
    
    if (!Array.isArray(response.data)) {
      throw new Error('获取数据失败：响应格式错误')
    }
    
    // 更新数据
    behaviors.value = response.data.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    console.log('列表数据更新成功，总条数:', behaviors.value.length)
  } catch (error) {
    console.error('获取行为记录失败:', error)
    
    let errorMessage = '获取数据失败'
    if (error.response) {
      const { status, data } = error.response
      console.error('获取数据错误响应:', { status, data })
      errorMessage = data?.message || '获取数据失败，请稍后重试'
    }
    
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 获取学生列表
const fetchStudents = async () => {
  try {
    const response = await axios.get('/api/students')
    students.value = response.data
  } catch (error) {
    console.error('获取学生列表失败:', error)
    ElMessage.error('获取学生列表失败')
  }
}

// 获取行为类型列表
const fetchBehaviorTypes = async () => {
  try {
    const response = await axios.get('/api/behavior-types')
    behaviorTypes.value = response.data
  } catch (error) {
    console.error('获取行为类型失败:', error)
    ElMessage.error('获取行为类型失败')
  }
}

// 获取行为类型标签样式
const getBehaviorType = (type) => {
  const behaviorType = behaviorTypes.value.find(t => t.name === type)
  return behaviorType?.category === '违纪' ? 'danger' : 'success'
}

// 修改el-upload组件配置
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Accept': 'application/json'
}))

const beforeImageUpload = (file) => {
  console.log('准备上传文件:', file.name, file.type, file.size)
  
  const isImage = /^image\/(jpeg|png|gif)$/.test(file.type)
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传JPG/PNG/GIF格式的图片!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  
  return true
}

const handleImageSuccess = (response) => {
  console.log('上传成功，响应数据:', response)
  if (response.url) {
    // 保存服务器返回的原始路径
    form.value.image_url = response.url
    ElMessage.success('图片上传成功')
  } else {
    console.error('无效的响应格式:', response)
    ElMessage.error('图片上传失败：服务器返回的数据格式不正确')
  }
}

const handleImageError = (error, file) => {
  console.error('图片上传失败:', error)
  console.error('文件信息:', file)
  
  let errorMessage = '图片上传失败'
  
  if (error.response) {
    const response = error.response
    console.error('错误响应:', response)
    errorMessage += `: ${response.data?.message || response.statusText || '未知错误'}`
  } else if (error.message) {
    errorMessage += `: ${error.message}`
  }
  
  ElMessage.error(errorMessage)
}

// 修改添加行为记录的方法
const handleAdd = () => {
  form.value = {
    id: null,
    student_id: '',
    behavior_type: '',
    description: '',
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    image_url: ''
  }
  dialogVisible.value = true
}

// 修改行为记录
const handleEdit = (row) => {
  form.value = {
    id: row.id,
    student_id: row.student_id,
    behavior_type: row.behavior_type,
    description: row.description,
    date: row.date,
    image_url: row.image_url
  }
  dialogVisible.value = true
}

// 修改提交表单的处理
const handleSubmit = async () => {
  if (!formRef.value || submitting.value) return

  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    const requestData = {
      student_id: parseInt(form.value.student_id),
      behavior_type: form.value.behavior_type,
      description: form.value.description.trim(),
      date: form.value.date,
      image_url: form.value.image_url
    }

    let response
    try {
      if (form.value.id) {
        // 修改现有记录
        console.log('正在更新记录，row.id:', form.value.id, '数据:', requestData)
        response = await axios.put(`/api/behaviors/update/${form.value.id}`, requestData)
        console.log('更新响应:', response)
        ElMessage.success('更新成功')
      } else {
        // 添加新记录
        console.log('正在添加新记录，数据:', requestData)
        response = await axios.post('/api/behaviors', requestData)
        console.log('添加响应:', response)
        ElMessage.success('添加成功')
      }

      if (response && response.data) {
        if (form.value.id) {
          // 更新现有记录
          const index = behaviors.value.findIndex(b => b.id === form.value.id)
          if (index !== -1) {
            behaviors.value[index] = response.data
          }
        } else {
          // 添加新记录到列表开头
          behaviors.value.unshift(response.data)
        }
        
        dialogVisible.value = false
        resetForm()
      }
    } catch (error) {
      console.error('操作失败:', error)
      console.error('错误响应:', error.response)
      
      let errorMessage = error.response?.data?.message || (form.value.id ? '更新失败' : '添加失败')
      
      // 处理特定的错误情况
      if (error.response?.status === 404) {
        errorMessage = '找不到要更新的记录，请刷新页面后重试'
        console.log('尝试刷新列表获取最新数据')
        await fetchBehaviors()
      } else if (error.response?.status === 400) {
        errorMessage = '请求数据格式错误，请检查输入'
      } else if (error.response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试'
      }
      
      ElMessage.error(errorMessage)
      console.log('错误详情:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data ? JSON.parse(error.config.data) : requestData
      })
    }
  } catch (error) {
    console.error('表单验证失败:', error)
    ElMessage.error('请检查表单填写是否正确')
  } finally {
    submitting.value = false
  }
}

// 添加重置表单方法
const resetForm = () => {
  form.value = {
    id: null,
    student_id: '',
    behavior_type: '',
    description: '',
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    image_url: null
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 修改删除方法
const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这条记录吗？删除后不可恢复。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        console.log('正在删除记录:', row.id)
        
        // 使用统一的API接口
        const response = await axios.delete('/api/behaviors/'+row.id, {
          action: 'delete',
          id: row.id
        })
        
        console.log('删除响应:', response)
        
        // 检查响应状态
        if (!response || !response.data) {
          throw new Error('服务器响应异常')
        }
        
        // 从本地数据中移除
        const index = behaviors.value.findIndex(b => b.id === row.id)
        if (index !== -1) {
          behaviors.value.splice(index, 1)
          console.log('本地数据已更新，移除索引:', index)
          ElMessage.success('删除成功')
        } else {
          console.warn('在本地数据中未找到要删除的记录:', row.id)
          ElMessage.success('删除成功，正在刷新列表')
        }
        
        // 刷新列表以确保数据同步
        await fetchBehaviors()
      } catch (error) {
        console.error('删除行为记录失败:', error)
        
        // 构建错误消息
        let errorMessage = '删除失败'
        if (error.response) {
          const { status, data } = error.response
          console.error('服务器错误响应:', { status, data })
          
          switch (status) {
            case 404:
              errorMessage = '找不到要删除的记录'
              break
            case 400:
              errorMessage = data?.message || '请求参数错误'
              break
            case 500:
              errorMessage = '服务器内部错误'
              break
            default:
              errorMessage = data?.message || '删除失败，请稍后重试'
          }
          
          // 如果是404错误，刷新列表
          if (status === 404) {
            await fetchBehaviors()
          }
        }
        
        ElMessage.error(errorMessage)
        
        // 记录详细错误信息
        console.log('删除操作错误详情:', {
          error,
          response: error.response,
          request: {
            id: row.id,
            action: 'delete'
          }
        })
      }
    })
    .catch(() => {
      // 用户取消删除操作
      ElMessage.info('已取消删除')
    })
}

// 处理筛选
const handleFilter = () => {
  // 筛选会自动通过计算属性处理
}

const getImageUrl = (url) => {
  if (!url) return ''
  
  console.log('处理图片URL:', url)
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http')) {
    return url
  }
  
  // 如果以/uploads开头，直接返回完整路径
  if (url.startsWith('/uploads/')) {
    return url
  }
  
  // 如果不以/开头，添加/uploads/
  if (!url.startsWith('/')) {
    return `/uploads/${url}`
  }
  
  return url
}

// 图片加载处理
const handleImageLoad = (row) => {
  if (row.imageLoadError) {
    row.imageLoadError = false;
  }
}

const handleImageLoadError = (row) => {
  row.imageLoadError = true;
}

// 修改el-image组件的配置
const imageProps = {
  fit: 'cover',
  'preview-teleported': true,
  'hide-on-click-modal': false,
  loading: 'lazy'
}

onMounted(() => {
  fetchBehaviors()
  fetchStudents()
  fetchBehaviorTypes()
})
</script>

<style scoped>
.behaviors-container {
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

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 50px;
  position: relative;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
  position: relative;
}

.behavior-image-thumb {
  width: 50px !important;
  height: 50px !important;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  object-fit: cover;
  border: 1px solid #ebeef5;
  display: block;
}

.behavior-image-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.image-loading, .image-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  color: #909399;
  font-size: 12px;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 4px;
}

.image-loading .el-icon, .image-error .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.no-image {
  color: #909399;
  font-size: 12px;
}

:deep(.el-image-viewer__wrapper) {
  z-index: 2100;
}

:deep(.el-image-viewer__mask) {
  opacity: 0.9;
}

:deep(.el-image-viewer__close) {
  color: #fff;
}

:deep(.el-image-viewer__actions) {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.7);
}

:deep(.el-image-viewer__canvas) {
  user-select: none;
}

:deep(.el-image-viewer__img) {
  background-color: transparent;
}

.behavior-image {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.behavior-image-uploader {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.behavior-image-uploader:hover {
  border-color: var(--el-color-primary);
}

.behavior-image-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}

.el-upload__tip {
  font-size: 12px;
  color: #606266;
  margin-top: 5px;
}
</style> 