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
              :label="getGradeFilterDisplay(grade)"
              :value="grade"
            >
              <el-tag
                :type="getGradeTagType(grade)"
                size="small"
                class="grade-tag"
              >
                {{ getGradeFilterDisplay(grade) }}
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
          <el-button type="primary" @click="handleBatchEdit" :disabled="!selectedStudents.length">
            批量修改
          </el-button>
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
        <el-table-column prop="status" label="状态" sortable="custom" width="120">
          <template #default="scope">
            <el-tag
              :style="getStatusStyle(scope.row.status)"
              size="small"
              :data-status="scope.row.status"
            >
              {{ scope.row.status || '正常' }}
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
              <el-select
                v-model="form.grade"
                placeholder="请选择年级"
                style="width: 100%"
                allow-create
                filterable
                :filter-method="handleGradeFilter"
                @blur="handleGradeBlur"
              >
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
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择学生状态" style="width: 100%">
                <el-option label="正常" value="正常" />
                <el-option label="警告" value="警告" />
                <el-option label="严重警告" value="严重警告" />
                <el-option label="记过" value="记过" />
                <el-option label="留校察看" value="留校察看" />
                <el-option label="勒令退学" value="勒令退学" />
                <el-option label="开除学籍" value="开除学籍" />
              </el-select>
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

    <!-- 添加批量编辑对话框 -->
    <el-dialog
      v-model="batchEditDialogVisible"
      title="批量修改"
      width="600px"
    >
      <el-form
        ref="batchFormRef"
        :model="batchForm"
        label-width="100px"
      >
        <el-form-item label="选择字段">
          <el-select
            v-model="selectedFields"
            multiple
            placeholder="请选择要修改的字段"
            style="width: 100%"
          >
            <el-option label="年级" value="grade" />
            <el-option label="班级" value="class" />
            <el-option label="班主任" value="teacher" />
            <el-option label="状态" value="status" />
          </el-select>
        </el-form-item>

        <!-- 年级字段 -->
        <el-form-item
          v-if="selectedFields.includes('grade')"
          label="年级"
        >
          <el-select 
            v-model="batchForm.grade" 
            placeholder="请选择年级" 
            style="width: 100%"
            filterable
            allow-create
            :filter-method="handleBatchGradeFilter"
            @blur="handleBatchGradeBlur"
          >
            <el-option
              v-for="grade in grades"
              :key="grade"
              :label="getGradeFilterDisplay(grade)"
              :value="grade"
            >
              <el-tag
                :type="getGradeTagType(grade)"
                size="small"
                class="grade-tag"
              >
                {{ getGradeFilterDisplay(grade) }}
              </el-tag>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 班级字段 -->
        <el-form-item
          v-if="selectedFields.includes('class')"
          label="班级"
        >
          <el-input
            v-model="batchForm.class"
            placeholder="请输入班级"
          />
        </el-form-item>

        <!-- 班主任字段 -->
        <el-form-item
          v-if="selectedFields.includes('teacher')"
          label="班主任"
        >
          <el-input
            v-model="batchForm.teacher"
            placeholder="请输入班主任姓名"
          />
        </el-form-item>

        <!-- 状态字段 -->
        <el-form-item
          v-if="selectedFields.includes('status')"
          label="状态"
        >
          <el-select
            v-model="batchForm.status"
            placeholder="请选择状态"
            style="width: 100%"
          >
            <el-option label="正常" value="正常" />
            <el-option label="警告" value="警告" />
            <el-option label="严重警告" value="严重警告" />
            <el-option label="记过" value="记过" />
            <el-option label="留校察看" value="留校察看" />
            <el-option label="勒令退学" value="勒令退学" />
            <el-option label="开除学籍" value="开除学籍" />
          </el-select>
        </el-form-item>

        <el-alert
          v-if="selectedStudents.length"
          type="warning"
          :title="'已选择 ' + selectedStudents.length + ' 名学生'"
          show-icon
          style="margin-bottom: 20px"
        />
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchEditDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleBatchEditSubmit" :loading="loading">
            确认修改
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import api from '../api'
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

const currentYear = new Date().getFullYear()

const form = ref({
  name: '',
  student_id: '',
  class: '',
  grade: '',
  gradeYear: '',
  teacher: '',
  photo_url: '',
  address: '',
  emergency_contact: '',
  emergency_phone: '',
  notes: '',
  status: '正常'
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
    { required: true, message: '请选择或输入年级', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请选择或输入年级'))
        } else if (['高一', '高二', '高三'].includes(value)) {
          callback()
        } else if (/^\d{4}级$/.test(value)) {
          // 验证年份范围
          const year = parseInt(value)
          const currentYear = new Date().getFullYear()
          if (year >= currentYear - 5 && year <= currentYear + 5) {
            callback()
          } else {
            callback(new Error('年级年份必须在合理范围内'))
          }
        } else if (/^\d{4}$/.test(value)) {
          // 验证纯数字年份范围
          const year = parseInt(value)
          const currentYear = new Date().getFullYear()
          if (year >= currentYear - 5 && year <= currentYear + 5) {
            callback()
          } else {
            callback(new Error('年级年份必须在合理范围内'))
          }
        } else {
          callback(new Error('年级格式不正确，请输入"高一"、"高二"、"高三"或4位数年份'))
        }
      },
      trigger: 'change'
    }
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

// 修改grades计算属性
const grades = computed(() => {
  // 获取固定的年级选项
  const fixedGrades = ['高一', '高二', '高三'];
  
  // 从学生列表中获取所有年级
  const yearGrades = new Set();
  students.value.forEach(student => {
    if (student.grade && !fixedGrades.includes(student.grade)) {
      yearGrades.add(student.grade);
    }
  });
  
  // 合并固定年级和年份年级，并排序
  const allGrades = [...fixedGrades, ...Array.from(yearGrades)].sort((a, b) => {
    // 如果都是"高X"格式，按序号排序
    if (a.startsWith('高') && b.startsWith('高')) {
      return a.localeCompare(b);
    }
    
    // 如果都是年份格式，按年份排序
    const yearA = parseInt(a) || 9999;
    const yearB = parseInt(b) || 9999;
    return yearA - yearB;
  });
  
  return allGrades;
});

// 修改筛选器的显示样式
const getGradeFilterDisplay = (grade) => {
  if (['高一', '高二', '高三'].includes(grade)) {
    return grade;
  }
  // 如果是年份格式（如"2024级"），保持原样显示
  return grade;
};

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
  if (!grade) return 'info';
  
  if (grade === '高一') return 'success';
  if (grade === '高二') return 'warning';
  if (grade === '高三') return 'danger';
  
  // 处理年份格式（如"2024级"）
  const yearMatch = grade.match(/^(\d{4})级$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const currentYear = new Date().getFullYear();
    const yearDiff = year - currentYear;
    
    if (yearDiff <= 0) return 'success';      // 当前或以前的年级
    if (yearDiff === 1) return 'warning';     // 下一年级
    return 'danger';                          // 未来年级
  }
  
  return 'info';  // 默认返回info类型
};

// 添加分页相关的响应式变量
const currentPage = ref(1)
const pageSize = ref(10)

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

// 修改排序处理函数
const handleSortChange = ({ prop, order }) => {
  sortBy.value = prop
  sortOrder.value = order
  // 重置页码
  currentPage.value = 1
}

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
      if (sortBy.value === 'status') {
        // 使用状态权重进行排序
        const weightA = statusWeight[a.status || '正常']
        const weightB = statusWeight[b.status || '正常']
        return (weightA - weightB) * order
      } else if (sortBy.value === 'violation_count' || sortBy.value === 'excellent_count') {
        return ((a[sortBy.value] || 0) - (b[sortBy.value] || 0)) * order
      } else {
        const valueA = a[sortBy.value] || ''
        const valueB = b[sortBy.value] || ''
        return valueA.toString().localeCompare(valueB.toString()) * order
      }
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

const handleAdd = () => {
  form.value = {
    name: '',
    student_id: '',
    class: '',
    grade: '',
    gradeYear: '',
    teacher: '',
    photo_url: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    notes: '',
    status: '正常'
  }
  dialogVisible.value = true
}

const fetchStudents = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/students')
    if (response && response) {
      console.log('获取到的学生列表:', response)
      students.value = response
    }
  } catch (error) {
    console.error('获取学生列表失败:', error)
    ElMessage.error('获取学生列表失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (row) => {
  const formData = { ...row }
  // 如果grade存在且格式正确，提取年份
  if (formData.grade && /^\d{4}级$/.test(formData.grade)) {
    formData.gradeYear = formData.grade.replace('级', '')
  }
  form.value = formData
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
        await api.delete(`/api/students/${row.id}`)
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
    
    // 处理年级格式
    let gradeValue = form.value.grade?.trim()
    if (/^\d{4}$/.test(gradeValue)) {
      gradeValue = `${gradeValue}级`
    }
    
    const submitData = {
      name: form.value.name?.trim() || '',
      student_id: form.value.student_id?.trim() || '',
      grade: gradeValue || '',
      class: classValue,
      teacher: form.value.teacher?.trim() || '',
      photo_url: form.value.photo_url || '',
      address: form.value.address?.trim() || '',
      emergency_contact: form.value.emergency_contact?.trim() || '',
      emergency_phone: form.value.emergency_phone?.trim() || '',
      notes: form.value.notes?.trim() || '',
      status: form.value.status || '正常'
    }

    // 打印请求前的完整数据
    console.log('发送请求前的完整数据:', {
      id: form.value.id,
      submitData,
      currentStatus: form.value.status,
      method: form.value.id ? 'PUT' : 'POST',
      url: form.value.id ? `/api/students/${form.value.id}` : '/api/students'
    })

    let response
    if (form.value.id) {
      console.log('执行更新操作，ID:', form.value.id)
      response = await api.put(`/api/students/${form.value.id}`, submitData)
      console.log('更新响应数据:', response)
    } else {
      console.log('执行添加操作')
      response = await api.post('/api/students', submitData)
      console.log('添加响应数据:', response)
    }
    
    if (response && response) {
      if (!form.value.id) {
        students.value.unshift(response)
      } else {
        const index = students.value.findIndex(item => item.id === form.value.id)
        if (index !== -1) {
          students.value[index] = response
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
        gradeYear: '',
        teacher: '',
        photo_url: '',
        address: '',
        emergency_contact: '',
        emergency_phone: '',
        notes: '',
        status: '正常'  // 确保设置默认状态
      }
      
      console.log('重置表单后的完整数据:', form.value)
      
      // 刷新学生列表
      await fetchStudents()
    }
  } catch (error) {
    console.error('提交失败:', error)
    console.error('错误详情:', {
      formData: form.value,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      fullError: error,
      requestData: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data ? JSON.parse(error.config.data) : null
      }
    })
    
    // 显示更详细的错误信息
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else if (error.response?.data?.details) {
      ElMessage.error(error.response.data.details)
    } else if (error.message) {
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
        // 使用新的批量删除接口
        const response = await api.post('/api/students/batch-delete', {
          ids: selectedStudents.value.map(student => student.id)
        })
        
        if (response.deletedCount > 0) {
          ElMessage.success(`成功删除 ${response.deletedCount} 名学生`)
          // 重新获取学生列表
          await fetchStudents()
        } else {
          ElMessage.warning('没有学生被删除')
        }
      } catch (error) {
        console.error('批量删除失败:', error)
        if (error.response?.data?.message) {
          ElMessage.error(error.response.data.message)
        } else {
          ElMessage.error('批量删除失败')
        }
      } finally {
        loading.value = false
        // 清空选择
        selectedStudents.value = []
      }
    })
    .catch(() => {
      // 用户取消删除操作
    })
}

// 修改年级输入处理函数
const handleGradeFilter = (query) => {
  // 如果输入的是数字，自动添加"级"后缀
  if (/^\d{4}$/.test(query)) {
    const year = parseInt(query)
    const currentYear = new Date().getFullYear()
    if (year >= currentYear - 5 && year <= currentYear + 5) {
      form.value.grade = query
    }
  }
};

// 在年级输入框失去焦点时处理
const handleGradeBlur = () => {
  if (/^\d{4}$/.test(form.value.grade)) {
    form.value.grade = `${form.value.grade}级`
  }
};

// 添加批量编辑相关的响应式变量
const batchEditDialogVisible = ref(false)
const selectedFields = ref([])
const batchForm = ref({
  gradeYear: '',
  grade: '',
  class: '',
  teacher: '',
  status: ''
})
const batchFormRef = ref(null)

// 处理批量编辑按钮点击
const handleBatchEdit = () => {
  if (!selectedStudents.value.length) {
    ElMessage.warning('请先选择要修改的学生')
    return
  }
  
  // 重置表单
  selectedFields.value = []
  batchForm.value = {
    gradeYear: '',
    grade: '',
    class: '',
    teacher: '',
    status: ''
  }
  
  batchEditDialogVisible.value = true
}

// 处理批量年级输入
const handleBatchGradeInput = (value) => {
  if (value) {
    const year = parseInt(value)
    if (year >= 2022) {
      batchForm.value.grade = `${year}级`
    }
  } else {
    batchForm.value.grade = ''
  }
}

// 处理批量编辑提交
const handleBatchEditSubmit = async () => {
  if (!selectedFields.value.length) {
    ElMessage.warning('请选择要修改的字段')
    return
  }

  try {
    loading.value = true
    
    // 构建更新数据
    const updateData = {}
    if (selectedFields.value.includes('grade')) {
      if (!batchForm.value.grade) {
        ElMessage.warning('请输入年级')
        return
      }
      updateData.grade = batchForm.value.grade
    }
    if (selectedFields.value.includes('class')) {
      if (!batchForm.value.class) {
        ElMessage.warning('请输入班级')
        return
      }
      // 处理班级数据，移除末尾的"班"字（如果有）
      updateData.class = batchForm.value.class?.trim().replace(/班$/, '')
    }
    if (selectedFields.value.includes('teacher')) {
      if (!batchForm.value.teacher) {
        ElMessage.warning('请输入班主任姓名')
        return
      }
      updateData.teacher = batchForm.value.teacher?.trim()
    }
    if (selectedFields.value.includes('status')) {
      if (!batchForm.value.status) {
        ElMessage.warning('请选择状态')
        return
      }
      updateData.status = batchForm.value.status
    }

    console.log('批量更新数据:', updateData)
    console.log('选中的学生:', selectedStudents.value)

    // 创建批量更新请求的Promise数组
    const updatePromises = selectedStudents.value.map(async student => {
      try {
        const response = await api.put(`/api/students/${student.id}`, updateData)
        return response
      } catch (error) {
        console.error(`更新学生 ${student.name}(ID: ${student.id}) 失败:`, error)
        throw error
      }
    })

    // 等待所有更新请求完成
    await Promise.all(updatePromises)
      .then(() => {
        ElMessage.success('批量修改成功')
        // 重新获取学生列表
        fetchStudents()
        // 关闭对话框
        batchEditDialogVisible.value = false
      })
      .catch(error => {
        console.error('批量更新过程中出现错误:', error)
        ElMessage.error('部分或全部学生更新失败，请检查后重试')
      })
  } catch (error) {
    console.error('批量修改失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('批量修改失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

// 添加批量年级输入处理函数
const handleBatchGradeFilter = (query) => {
  // 如果输入的是数字，自动添加"级"后缀
  if (/^\d{4}$/.test(query)) {
    const year = parseInt(query)
    const currentYear = new Date().getFullYear()
    if (year >= currentYear - 5 && year <= currentYear + 5) {
      batchForm.value.grade = query
    }
  }
}

// 在批量年级输入框失去焦点时处理
const handleBatchGradeBlur = () => {
  if (/^\d{4}$/.test(batchForm.value.grade)) {
    batchForm.value.grade = `${batchForm.value.grade}级`
  }
}

// 添加状态标签类型函数
const getStatusTagType = (status) => {
  switch (status) {
    case '正常':
      return 'success'
    case '警告':
      return 'warning'
    case '严重警告':
      return 'danger'
    case '记过':
      return 'danger'
    case '留校察看':
      return 'danger'
    case '勒令退学':
      return 'danger'
    case '开除学籍':
      return 'danger'
    default:
      return 'success'
  }
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
  align-items: center;
}

.action-group .el-button {
  margin-left: 0;
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

/* 添加年级标签的自定义样式 */
:deep(.el-tag) {
  border-radius: 4px;
  padding: 0 12px;
  height: 24px;
  line-height: 24px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

:deep(.el-tag:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 严重警告及以上状态的特殊效果 */
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

/* 添加批量编辑对话框的样式 */
:deep(.el-select .el-select__tags) {
  flex-wrap: wrap;
  max-height: 36px;
  overflow: hidden;
}

:deep(.el-select .el-select__tags-text) {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 