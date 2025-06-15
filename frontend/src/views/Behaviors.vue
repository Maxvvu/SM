<template>
  <div class="behaviors-container">
    <div class="page-header">
      <div class="title-section">
        <h2>行为记录管理</h2>
        <el-tag type="info" effect="plain" class="total-count">
          共 {{ filteredBehaviors.length }} 条记录
        </el-tag>
      </div>
      <div class="header-content">
        <div class="search-section">
          <div class="search-box">
            <el-input
              v-model="searchQuery"
              placeholder="搜索学生姓名或描述"
              clearable
              @input="handleSearch"
              class="search-input"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
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
        <div class="filter-section">
          <div class="filter-group">
            <el-select 
              v-model="filterGrade" 
              placeholder="选择年级" 
              clearable 
              @change="handleFilter"
              class="filter-select"
            >
              <template #prefix>
                <el-icon><School /></el-icon>
              </template>
              <el-option label="高一" value="高一">
                <el-tag type="success" size="small">高一</el-tag>
              </el-option>
              <el-option label="高二" value="高二">
                <el-tag type="warning" size="small">高二</el-tag>
              </el-option>
              <el-option label="高三" value="高三">
                <el-tag type="danger" size="small">高三</el-tag>
              </el-option>
            </el-select>
            <el-select 
              v-model="filterCategory" 
              placeholder="行为类别" 
              clearable 
              @change="handleFilter"
              class="filter-select"
            >
              <template #prefix>
                <el-icon><Collection /></el-icon>
              </template>
              <el-option label="优秀行为" value="优秀">
                <div class="custom-option">
                  <el-icon class="option-icon" color="#67C23A"><CircleCheckFilled /></el-icon>
                  <span>优秀行为</span>
                </div>
              </el-option>
              <el-option label="违纪行为" value="违纪">
                <div class="custom-option">
                  <el-icon class="option-icon" color="#F56C6C"><WarningFilled /></el-icon>
                  <span>违纪行为</span>
                </div>
              </el-option>
            </el-select>
            <el-select 
              v-model="filterType" 
              placeholder="行为类型" 
              clearable 
              @change="handleFilter"
              class="filter-select"
            >
              <template #prefix>
                <el-icon><List /></el-icon>
              </template>
              <el-option-group label="违纪行为">
                <el-option
                  v-for="type in behaviorTypes.filter(t => t.category === '违纪')"
                  :key="type.id"
                  :label="type.name"
                  :value="type.name"
                >
                  <div class="custom-option">
                    <el-icon class="option-icon" color="#F56C6C"><WarningFilled /></el-icon>
                    <span>{{ type.name }}</span>
                  </div>
                </el-option>
              </el-option-group>
              <el-option-group label="优秀表现">
                <el-option
                  v-for="type in behaviorTypes.filter(t => t.category === '优秀')"
                  :key="type.id"
                  :label="type.name"
                  :value="type.name"
                >
                  <div class="custom-option">
                    <el-icon class="option-icon" color="#67C23A"><CircleCheckFilled /></el-icon>
                    <span>{{ type.name }}</span>
                  </div>
                </el-option>
              </el-option-group>
            </el-select>
          </div>
          <div class="action-group">
            <el-button type="primary" @click="handleAdd" class="add-button">
              <el-icon><Plus /></el-icon>
              <span>添加记录</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="table-container">
      <el-table 
        :data="paginatedBehaviors" 
        style="width: 100%"
        v-loading="loading"
        :header-cell-style="{ background: 'var(--el-color-primary-light-9)', color: 'var(--el-text-color-primary)' }"
        :row-class-name="rowClassName"
        ref="tableRef"
      >
        <el-table-column prop="student_name" label="学生姓名" sortable />
        <el-table-column prop="grade" label="年级" sortable width="100" />
        <el-table-column prop="class" label="班级" sortable width="100" />
        <el-table-column prop="student_status" label="学生状态" width="120">
          <template #default="scope">
            <el-tag
              :style="getStatusStyle(scope.row.student_status)"
              size="small"
              :data-status="scope.row.student_status"
            >
              {{ scope.row.student_status || '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="behavior_type" label="行为类型" width="180">
          <template #default="scope">
            <div class="behavior-type-container">
              <el-tag :type="getBehaviorType(scope.row.behavior_type)">
                {{ scope.row.behavior_type }}
              </el-tag>
              <span :class="['behavior-score', scope.row.behavior_score >= 0 ? 'positive' : 'negative']">
                {{ scope.row.behavior_score >= 0 ? '+' : '' }}{{ scope.row.behavior_score }}分
              </span>
            </div>
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
            {{ scope.row.date }}
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

    <!-- 添加详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="行为记录详情"
      width="600px"
      class="behavior-detail-dialog"
    >
      <div class="detail-content" v-if="selectedBehavior">
        <div class="detail-header">
          <div class="student-info">
            <h3>{{ selectedBehavior.student_name }}</h3>
            <div class="student-meta">
              <el-tag :type="getGradeTagType(selectedBehavior.grade)" size="small">
                {{ selectedBehavior.grade }}
              </el-tag>
              <el-tag type="info" size="small" effect="plain">
                {{ selectedBehavior.class }}班
              </el-tag>
              <el-tag
                :style="getStatusStyle(selectedBehavior.student_status)"
                size="small"
                :data-status="selectedBehavior.student_status"
              >
                {{ selectedBehavior.student_status || '正常' }}
              </el-tag>
            </div>
          </div>
          <div class="behavior-type">
            <el-tag :type="getBehaviorType(selectedBehavior.behavior_type)" size="large">
              {{ selectedBehavior.behavior_type }}
            </el-tag>
            <span :class="['behavior-score', selectedBehavior.behavior_score >= 0 ? 'positive' : 'negative']">
              {{ selectedBehavior.behavior_score >= 0 ? '+' : '' }}{{ selectedBehavior.behavior_score }}分
            </span>
          </div>
        </div>

        <el-divider />

        <div class="detail-body">
          <div class="detail-item">
            <label>记录时间：</label>
            <span>{{ selectedBehavior.date }}</span>
          </div>

          <div class="detail-item description">
            <label>详细描述：</label>
            <p>{{ selectedBehavior.description }}</p>
          </div>

          <div class="detail-item process-result">
            <div class="process-result-header">
              <label>处理结果：</label>
              <div class="process-result-actions" v-if="!isEditing">
                <el-button type="primary" link @click="handleStartEdit">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
              </div>
              <div class="process-result-actions" v-else>
                <el-button type="success" link @click="handleSaveEdit" :loading="submitting">
                  <el-icon><Check /></el-icon>
                  保存
                </el-button>
                <el-button type="danger" link @click="handleCancelEdit">
                  <el-icon><Close /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
            <el-input
              v-if="isEditing"
              v-model="editForm.process_result"
              type="textarea"
              :rows="2"
              placeholder="请输入处理结果"
            />
            <p v-else>{{ selectedBehavior.process_result || '暂未处理' }}</p>
          </div>

          <div class="detail-item image" v-if="selectedBehavior.image_url">
            <label>相关图片：</label>
            <div class="image-preview">
              <el-image
                :src="getImageUrl(selectedBehavior.image_url)"
                :preview-src-list="[getImageUrl(selectedBehavior.image_url)]"
                preview-teleported
                :initial-index="0"
                fit="contain"
                class="detail-image"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

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
        <el-form-item label="图片">
          <el-upload
            class="behavior-image-uploader"
            action="/api/upload?type=behaviors"
            name="file"
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
import api from '../api'
import moment from 'moment'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Picture, 
  Loading, 
  School, 
  Collection, 
  List,
  CircleCheckFilled,
  WarningFilled,
  Search,
  Calendar,
  Edit,
  Check,
  Close
} from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const behaviors = ref([])
const students = ref([])
const behaviorTypes = ref([])
const filterGrade = ref('')
const filterCategory = ref('')
const filterType = ref('')
const formRef = ref(null)
const searchQuery = ref('')
const dateRange = ref(null)

// 添加分页相关的响应式变量
const currentPage = ref(1)
const pageSize = ref(10)

const form = ref({
  id: null,
  student_id: '',
  behavior_type: '',
  description: '',
  date: "",
  image_url: '',
  process_result: ''
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

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  }
]

// 添加日期选择器快捷选项
const datePickerShortcuts = [
  {
    text: '今天',
    value: new Date(),
  },
  {
    text: '昨天',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() - 3600 * 1000 * 24)
      return date
    },
  },
  {
    text: '一周前',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() - 3600 * 1000 * 24 * 7)
      return date
    },
  },
]

// 修改数据过滤和分页逻辑
const filteredBehaviors = computed(() => {
  let result = [...behaviors.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(behavior => 
      behavior.student_name.toLowerCase().includes(query) || 
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
  
  // 年级过滤
  if (filterGrade.value) {
    result = result.filter(b => b.grade === filterGrade.value)
  }
  
  // 行为类别过滤
  if (filterCategory.value) {
    const categoryTypes = behaviorTypes.value
      .filter(t => t.category === filterCategory.value)
      .map(t => t.name)
    result = result.filter(b => categoryTypes.includes(b.behavior_type))
  }

  // 具体行为类型过滤
  if (filterType.value) {
    result = result.filter(b => b.behavior_type === filterType.value)
  }
  
  return result
})

// 添加分页数据计算属性
const paginatedBehaviors = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filteredBehaviors.value.slice(startIndex, startIndex + pageSize.value)
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
  // 如果选择了新的类别，清空具体行为类型的选择
  if (filterCategory.value) {
    filterType.value = ''
  }
  // 重置页码
  currentPage.value = 1
}

// 获取行为记录列表
const fetchBehaviors = async () => {
  try {
    loading.value = true
    console.log('正在获取行为记录列表...')
    
    const response = await api.get('/api/behaviors')
    console.log('获取列表响应:', response)
    
    if (!response || !response) {
      console.error('响应数据为空')
      ElMessage.error('获取数据失败')
      return
    }
    
    if (!Array.isArray(response)) {
      console.error('响应数据不是数组:', response)
      ElMessage.error('数据格式错误')
      return
    }
    
    behaviors.value = response.map(behavior => ({
      ...behavior,
      date: moment(behavior.date).format('YYYY-MM-DD HH:mm:ss')
    }))
    
    console.log('处理后的行为记录:', behaviors.value)
  } catch (error) {
    console.error('获取行为记录失败:', error)
    let errorMessage = '获取行为记录失败'
    if (error.response) {
      errorMessage += `: ${error.response?.message || error.response.statusText || '未知错误'}`
    }
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 获取学生列表
const fetchStudents = async () => {
  try {
    const response = await api.get('/api/students')
    students.value = response
  } catch (error) {
    console.error('获取学生列表失败:', error)
    ElMessage.error('获取学生列表失败')
  }
}

// 获取行为类型列表
const fetchBehaviorTypes = async () => {
  try {
    const response = await api.get('/api/behaviorTypes')
    behaviorTypes.value = response
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
  console.log('图片上传成功，完整响应数据:', response)
  
  if (response.url) {
    console.log('设置image_url前的form数据:', { ...form.value })
    // 保存服务器返回的原始路径
    form.value.image_url = response.url
    console.log('设置image_url后的form数据:', { ...form.value })
    console.log('设置的image_url值:', response.url)
    ElMessage.success('图片上传成功')
  } else {
    console.error('无效的响应格式:', response)
    console.error('响应数据类型:', typeof response)
    console.error('响应数据结构:', Object.keys(response))
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
    date: moment().format('YYYY-MM-DD HH:mm:ss'),
    image_url: '',
    process_result: ''
  }
  dialogVisible.value = true
}

// 修改行为记录
const handleEdit = (row) => {
  // 确保时间格式的一致性
  const formattedDate = moment(row.date).format('YYYY-MM-DD HH:mm:ss')
  
  form.value = {
    id: row.id,
    student_id: row.student_id,
    behavior_type: row.behavior_type,
    description: row.description,
    date: formattedDate,
    image_url: row.image_url,
    process_result: row.process_result
  }
  dialogVisible.value = true
}

// 修改提交表单的处理
const handleSubmit = async () => {
  if (!formRef.value || submitting.value) return

  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    // 处理时区问题，确保使用本地时间
    const formattedDate = moment(form.value.date).format('YYYY-MM-DDTHH:mm:ss')
    
    const requestData = {
      student_id: parseInt(form.value.student_id),
      behavior_type: form.value.behavior_type,
      description: form.value.description.trim(),
      date: formattedDate,
      image_url: form.value.image_url || null,
      process_result: form.value.process_result?.trim() || null
    }

    console.log('准备提交的数据:', requestData)

    let response
    try {
      if (form.value.id) {
        console.log('执行更新操作，ID:', form.value.id)
        response = await api.put(`/api/behaviors/${form.value.id}`, requestData)
        console.log('更新响应:', response.data)
        
        ElMessage.success({
          message: '行为记录更新成功',
          type: 'success',
          duration: 2000
        })
      } else {
        console.log('执行添加操作')
        response = await api.post('/api/behaviors', requestData)
        console.log('添加响应:', response.data)
        
        ElMessage.success({
          message: '行为记录添加成功',
          type: 'success',
          duration: 2000
        })
      }
      
      // 关闭对话框
      dialogVisible.value = false
      
      // 重置表单
      resetForm()
      
      // 刷新列表数据
      await fetchBehaviors()
      
      // 重置到第一页
      currentPage.value = 1
      
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error({
        message: error.response?.data?.message || (form.value.id ? '更新失败' : '添加失败'),
        type: 'error',
        duration: 3000
      })
      throw error
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error({
      message: error.response?.data?.message || (form.value.id ? '更新失败' : '添加失败'),
      type: 'error',
      duration: 3000
    })
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
    image_url: '',
    process_result: ''
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
        
        const response = await api.delete(`/api/behaviors/${row.id}`)
        
        console.log('删除响应:', response)
        
        // 检查响应状态，204 表示删除成功
        if (response?.status === 204) {
          // 从本地数据中移除
          const index = behaviors.value.findIndex(b => b.id === row.id)
          if (index !== -1) {
            behaviors.value.splice(index, 1)
            console.log('本地数据已更新，移除索引:', index)
            ElMessage.success('删除成功')
          } else {
            console.warn('在本地数据中未找到要删除的记录:', row.id)
            // 刷新列表
            await fetchBehaviors()
            ElMessage.success('删除成功，已刷新列表')
          }
        } else {
          // 如果响应状态不是 204，刷新列表以确保数据同步
          await fetchBehaviors()
          ElMessage.success('删除成功，已刷新列表')
        }
      } catch (error) {
        console.error('删除行为记录失败:', error)
        
        let errorMessage = '删除失败'
        if (error.response) {
          const { status, data } = error.response
          console.error('服务器错误响应:', { status, data })
          
          switch (status) {
            case 404:
              errorMessage = '找不到要删除的记录'
              break
            case 403:
              errorMessage = '没有删除权限'
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
        } else if (error.request) {
          errorMessage = '网络请求失败，请检查网络连接'
        }
        
        ElMessage.error(errorMessage)
        
        // 如果是404错误，刷新列表
        if (error.response?.status === 404) {
          await fetchBehaviors()
        }
      }
    })
    .catch(() => {
      // 用户取消删除操作
      ElMessage.info('已取消删除')
    })
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
  
  // 如果不以/开头，添加/uploads/behaviors/
  if (!url.startsWith('/')) {
    return `/uploads/behaviors/${url}`
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

// 添加详情对话框相关的响应式变量
const detailDialogVisible = ref(false)
const selectedBehavior = ref(null)
const isEditing = ref(false)
const editForm = ref({
  process_result: ''
})

// 添加行点击事件处理函数
const handleDetail = (row) => {
  selectedBehavior.value = { ...row }
  detailDialogVisible.value = true
}

// 修改表格组件，添加行点击事件
const tableRef = ref(null)
const rowClassName = () => 'clickable-row'

// 添加年级标签类型函数
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

// 添加状态权重映射
const statusWeight = {
  '正常': 0,
  '警告': 1,
  '严重警告': 2,
  '记过': 3,
  '留校察看': 4,
  '勒令退学': 5,
  '开除学籍': 6
}

// 添加状态标签样式函数
const getStatusStyle = (status) => {
  switch (status) {
    case '正常':
      return {
        backgroundColor: '#f0f9eb',
        borderColor: '#e1f3d8',
        color: '#67c23a'
      }
    case '警告':
      return {
        backgroundColor: '#fdf6ec',
        borderColor: '#faecd8',
        color: '#e6a23c'
      }
    case '严重警告':
      return {
        backgroundColor: '#fef0f0',
        borderColor: '#fde2e2',
        color: '#f56c6c'
      }
    case '记过':
      return {
        backgroundColor: '#fde2e2',
        borderColor: '#fbc4c4',
        color: '#f56c6c'
      }
    case '留校察看':
      return {
        backgroundColor: '#fcd3d3',
        borderColor: '#fab6b6',
        color: '#f56c6c'
      }
    case '勒令退学':
      return {
        backgroundColor: '#fb9898',
        borderColor: '#fa7a7a',
        color: '#fff'
      }
    case '开除学籍':
      return {
        backgroundColor: '#f56c6c',
        borderColor: '#f34d4d',
        color: '#fff'
      }
    default:
      return {
        backgroundColor: '#f0f9eb',
        borderColor: '#e1f3d8',
        color: '#67c23a'
      }
  }
}

// 修改处理结果编辑相关方法
const handleStartEdit = () => {
  editForm.value.process_result = selectedBehavior.value.process_result || ''
  isEditing.value = true
}

const handleSaveEdit = async () => {
  try {
    submitting.value = true
    const response = await api.put(`/api/behaviors/${selectedBehavior.value.id}`, {
      ...selectedBehavior.value,
      process_result: editForm.value.process_result?.trim() || null
    })
    
    // 更新本地数据
    const index = behaviors.value.findIndex(b => b.id === selectedBehavior.value.id)
    if (index !== -1) {
      behaviors.value[index] = {
        ...behaviors.value[index],
        process_result: editForm.value.process_result
      }
      selectedBehavior.value.process_result = editForm.value.process_result
    }
    
    isEditing.value = false
    ElMessage.success('处理结果已更新')
  } catch (error) {
    console.error('更新处理结果失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('更新处理结果失败')
    }
  } finally {
    submitting.value = false
  }
}

const handleCancelEdit = () => {
  isEditing.value = false
  editForm.value.process_result = selectedBehavior.value.process_result || ''
}

onMounted(() => {
  fetchBehaviors()
  fetchStudents()
  fetchBehaviorTypes()
})
</script>

<style scoped>
.behaviors-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.title-section h2 {
  margin: 0;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.total-count {
  font-size: 14px;
  padding: 4px 12px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-section {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  max-width: 300px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.date-picker {
  width: 320px;
  transition: all 0.3s ease;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 140px;
  flex: 1;
  max-width: 200px;
  transition: all 0.3s ease;
}

.filter-select :deep(.el-input__wrapper) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.custom-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-icon {
  font-size: 16px;
}

.action-group {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.table-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;
  padding: 12px 0;
}

:deep(.el-table td) {
  padding: 16px 0;
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: var(--el-color-primary-light-9);
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 60px;
}

.image-preview {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.image-preview:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.behavior-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-error, .image-loading {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  background-color: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.no-image {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.pagination-container {
  margin-top: 20px;
  padding: 10px 0;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-pagination) {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

:deep(.el-pagination .el-select .el-input) {
  width: 120px;
}

:deep(.el-pagination button),
:deep(.el-pagination .el-pager li) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: none;
  transition: all 0.3s ease;
}

:deep(.el-pagination button:hover),
:deep(.el-pagination .el-pager li:hover) {
  background-color: var(--el-color-primary-light-7);
}

:deep(.el-pagination .el-pager li.active) {
  background-color: var(--el-color-primary);
  color: white;
}

.behavior-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
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

.student-info {
  h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: var(--el-text-color-primary);
  }
}

.student-meta {
  display: flex;
  gap: 8px;
}

.behavior-type {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;

  .el-tag {
    font-size: 16px;
    padding: 8px 16px;
  }

  .behavior-score {
    font-size: 14px;
    font-weight: 600;
  }
}

.detail-body {
  .detail-item {
    margin-bottom: 16px;
    
    label {
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
      display: block;
    }
    
    &.description {
      p {
        margin: 0;
        line-height: 1.6;
        color: var(--el-text-color-primary);
      }
    }
    
    &.process-result {
      p {
        margin: 0;
        line-height: 1.6;
        color: var(--el-text-color-primary);
      }
    }
    
    &.image {
      .image-preview {
        width: 100%;
        height: auto;
        max-height: 400px;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 8px;
        
        .detail-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }
    }
  }
}

.behavior-image-uploader {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--el-color-primary);
  }
  
  .behavior-image {
    width: 178px;
    height: 178px;
    display: block;
    object-fit: cover;
  }
  
  .behavior-image-uploader-icon {
    font-size: 28px;
    color: var(--el-text-color-secondary);
    width: 178px;
    height: 178px;
    text-align: center;
    line-height: 178px;
  }
}

.button-group {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  align-items: center;
  padding-left: 0;
}

:deep(.el-table .cell) {
  padding-left: 0;
  padding-right: 0;
}

.button-group :deep(.el-button--small) {
  padding: 6px 12px;
  min-width: 60px;
  margin-left: 0;
}

@media screen and (max-width: 768px) {
  .behaviors-container {
    padding: 16px;
  }
  
  .page-header {
    padding: 16px;
  }
  
  .search-section,
  .filter-section {
    flex-direction: column;
  }
  
  .search-box,
  .date-picker,
  .filter-select {
    width: 100%;
    max-width: none;
  }
  
  .action-group {
    width: 100%;
    justify-content: flex-end;
  }
  
  .pagination-container {
    justify-content: center;
  }
  
  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .button-group {
    flex-wrap: nowrap;
    gap: 4px;
  }
  
  .button-group :deep(.el-button--small) {
    padding: 6px 8px;
    min-width: auto;
  }
}

/* 添加状态标签的动画效果 */
:deep(.el-tag[data-status="严重警告"]),
:deep(.el-tag[data-status="记过"]),
:deep(.el-tag[data-status="留校察看"]),
:deep(.el-tag[data-status="勒令退学"]),
:deep(.el-tag[data-status="开除学籍"]) {
  font-weight: 600;
}

/* 勒令退学和开除学籍的特殊动画效果 */
:deep(.el-tag[data-status="勒令退学"]),
:deep(.el-tag[data-status="开除学籍"]) {
  background-image: linear-gradient(45deg, 
    rgba(0,0,0,0.1) 25%, 
    transparent 25%, 
    transparent 50%, 
    rgba(0,0,0,0.1) 50%, 
    rgba(0,0,0,0.1) 75%, 
    transparent 75%, 
    transparent
  );
  background-size: 1rem 1rem;
  animation: status-stripe 1s linear infinite;
}

/* 警告状态的闪烁效果 */
:deep(.el-tag[data-status="警告"]) {
  animation: warning-blink 2s ease-in-out infinite;
}

@keyframes status-stripe {
  from { background-position: 0 0; }
  to { background-position: 1rem 1rem; }
}

@keyframes warning-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 添加悬停提示 */
:deep(.el-tag[data-status]) {
  cursor: default;
}

:deep(.el-tag[data-status]:hover)::after {
  content: attr(data-status);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  margin-bottom: 8px;
  opacity: 0;
  animation: tooltip-fade-in 0.2s ease-in-out forwards;
}

@keyframes tooltip-fade-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.behavior-type-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.behavior-score {
  font-size: 13px;
  font-weight: 500;
}

.behavior-score.positive {
  color: var(--el-color-success);
}

.behavior-score.negative {
  color: var(--el-color-danger);
}

.process-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.process-result-actions {
  display: flex;
  gap: 8px;
}

.process-result-actions .el-button {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.no-result {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.detail-item.process-result {
  background-color: var(--el-color-primary-light-9);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  
  .el-input {
    margin-top: 8px;
  }
  
  p {
    margin: 8px 0 0 0;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    padding: 8px;
    background-color: white;
    border-radius: 4px;
    min-height: 40px;
  }
}
</style> 