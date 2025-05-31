<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    class="behavior-form"
  >
    <el-form-item label="学生" prop="student_id">
      <el-select
        v-model="form.student_id"
        filterable
        placeholder="请选择学生"
        style="width: 100%"
      >
        <el-option
          v-for="student in students"
          :key="student.id"
          :label="`${student.name} (${student.grade}${student.class})`"
          :value="student.id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="行为类型" prop="behavior_type">
      <el-select
        v-model="form.behavior_type"
        filterable
        placeholder="请选择行为类型"
        style="width: 100%"
      >
        <el-option-group
          v-for="group in groupedTypes"
          :key="group.category"
          :label="group.category"
        >
          <el-option
            v-for="type in group.types"
            :key="type.name"
            :label="type.name"
            :value="type.name"
          />
        </el-option-group>
      </el-select>
    </el-form-item>

    <el-form-item label="描述" prop="description">
      <el-input
        v-model="form.description"
        type="textarea"
        :rows="3"
        placeholder="请输入行为描述"
      />
    </el-form-item>

    <el-form-item label="图片">
      <el-upload
        v-bind="uploadConfig"
        class="behavior-uploader"
        :on-success="handleImageSuccess"
        :on-error="handleUploadError"
      >
        <img v-if="form.image_url" :src="form.image_url" class="preview" />
        <el-icon v-else class="uploader-icon"><Plus /></el-icon>
      </el-upload>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '更新' : '记录' }}
      </el-button>
      <el-button @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { createUploadConfig } from '@/utils/upload'

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const formRef = ref(null)
const submitting = ref(false)
const students = ref([])
const behaviorTypes = ref([])

const form = ref({
  student_id: '',
  behavior_type: '',
  description: '',
  image_url: '',
  ...props.initialData
})

const rules = {
  student_id: [
    { required: true, message: '请选择学生', trigger: 'change' }
  ],
  behavior_type: [
    { required: true, message: '请选择行为类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入行为描述', trigger: 'blur' },
    { min: 5, max: 500, message: '描述长度在 5 到 500 个字符', trigger: 'blur' }
  ]
}

const uploadConfig = computed(() => ({
  ...createUploadConfig('behaviors'),
  class: 'behavior-uploader'
}))

const groupedTypes = computed(() => {
  const groups = {}
  behaviorTypes.value.forEach(type => {
    if (!groups[type.category]) {
      groups[type.category] = {
        category: type.category,
        types: []
      }
    }
    groups[type.category].types.push(type)
  })
  return Object.values(groups)
})

const handleImageSuccess = (response) => {
  form.value.image_url = response.url
}

const handleUploadError = () => {
  ElMessage.error('图片上传失败')
}

const fetchStudents = async () => {
  try {
    const { data } = await request.get('/api/students')
    students.value = data
  } catch (error) {
    // 错误处理已在request拦截器中完成
  }
}

const fetchBehaviorTypes = async () => {
  try {
    const { data } = await request.get('/api/behavior-types')
    behaviorTypes.value = data
  } catch (error) {
    // 错误处理已在request拦截器中完成
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (props.isEdit) {
          await request.put(`/api/behaviors/${props.initialData.id}`, form.value)
          ElMessage.success('更新行为记录成功')
        } else {
          await request.post('/api/behaviors', form.value)
          ElMessage.success('记录行为成功')
        }
        emit('submit')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  fetchStudents()
  fetchBehaviorTypes()
})
</script>

<style scoped>
.behavior-form {
  max-width: 600px;
  margin: 0 auto;
}

.behavior-uploader {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.behavior-uploader:hover {
  border-color: var(--el-color-primary);
}

.uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  line-height: 178px;
}

.preview {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}
</style> 