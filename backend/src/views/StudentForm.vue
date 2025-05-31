<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    class="student-form"
  >
    <el-form-item label="照片" prop="photo_url">
      <el-upload
        v-bind="uploadConfig"
        class="avatar-uploader"
        :on-success="handlePhotoSuccess"
        :on-error="handleUploadError"
      >
        <img v-if="form.photo_url" :src="form.photo_url" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
      </el-upload>
    </el-form-item>

    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.name" />
    </el-form-item>

    <el-form-item label="学号" prop="student_id">
      <el-input v-model="form.student_id" />
    </el-form-item>

    <el-form-item label="年级" prop="grade">
      <el-select v-model="form.grade" style="width: 100%">
        <el-option label="高一" value="高一" />
        <el-option label="高二" value="高二" />
        <el-option label="高三" value="高三" />
      </el-select>
    </el-form-item>

    <el-form-item label="班级" prop="class">
      <el-input v-model="form.class" />
    </el-form-item>

    <el-form-item label="地址" prop="address">
      <el-input v-model="form.address" />
    </el-form-item>

    <el-form-item label="紧急联系人" prop="emergency_contact">
      <el-input v-model="form.emergency_contact" />
    </el-form-item>

    <el-form-item label="紧急联系电话" prop="emergency_phone">
      <el-input v-model="form.emergency_phone" />
    </el-form-item>

    <el-form-item label="备注" prop="notes">
      <el-input
        v-model="form.notes"
        type="textarea"
        :rows="3"
        placeholder="请输入备注信息"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '更新' : '创建' }}
      </el-button>
      <el-button @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, computed } from 'vue'
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

const form = ref({
  name: '',
  student_id: '',
  grade: '',
  class: '',
  photo_url: '',
  address: '',
  emergency_contact: '',
  emergency_phone: '',
  notes: '',
  ...props.initialData
})

const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  student_id: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    { pattern: /^S\d{3,}$/, message: '学号格式不正确（以S开头加3位以上数字）', trigger: 'blur' }
  ],
  grade: [
    { required: true, message: '请选择年级', trigger: 'change' }
  ],
  class: [
    { required: true, message: '请输入班级', trigger: 'blur' }
  ],
  emergency_contact: [
    { required: true, message: '请输入紧急联系人', trigger: 'blur' }
  ],
  emergency_phone: [
    { required: true, message: '请输入紧急联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

const uploadConfig = computed(() => ({
  ...createUploadConfig('students'),
  class: 'avatar-uploader'
}))

const handlePhotoSuccess = (response) => {
  form.value.photo_url = response.url
}

const handleUploadError = () => {
  ElMessage.error('图片上传失败')
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (props.isEdit) {
          await request.put(`/api/students/${props.initialData.id}`, form.value)
          ElMessage.success('更新学生信息成功')
        } else {
          await request.post('/api/students', form.value)
          ElMessage.success('创建学生成功')
        }
        emit('submit')
      } finally {
        submitting.value = false
      }
    }
  })
}
</script>

<style scoped>
.student-form {
  max-width: 600px;
  margin: 0 auto;
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
  width: 178px;
  height: 178px;
  text-align: center;
  line-height: 178px;
}

.avatar {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}
</style> 