<template>
  <div class="behaviors-container">
    <div class="header">
      <h2>行为类型管理</h2>
      <el-button type="primary" @click="handleAdd">
        添加行为类型
      </el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="违纪行为" name="违纪">
        <el-table :data="violationTypes" style="width: 100%" v-loading="loading">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="score" label="分数" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.score < 0 ? 'danger' : 'success'" size="small">
                {{ scope.row.score }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button
                size="small"
                type="primary"
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
      </el-tab-pane>

      <el-tab-pane label="优秀表现" name="优秀">
        <el-table :data="excellentTypes" style="width: 100%" v-loading="loading">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="score" label="分数" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.score < 0 ? 'danger' : 'success'" size="small">
                {{ scope.row.score }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button
                size="small"
                type="primary"
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
      </el-tab-pane>
    </el-tabs>

    <!-- 添加/编辑行为类型对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑行为类型' : '添加行为类型'"
      width="500px"
    >
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" placeholder="请选择类别" style="width: 100%">
            <el-option label="违纪" value="违纪" />
            <el-option label="优秀" value="优秀" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入行为类型名称" />
        </el-form-item>
        <el-form-item label="分数" prop="score">
          <el-input-number 
            v-model="form.score" 
            :min="-100"
            :max="100"
            :step="1"
            style="width: 100%"
            :placeholder="form.category === '违纪' ? '请输入扣分分数（负数）' : '请输入加分分数（正数）'"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入行为类型描述"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const activeTab = ref('违纪')
const behaviorTypes = ref([])
const formRef = ref(null)

const form = ref({
  id: null,
  category: '',
  name: '',
  description: '',
  score: 0
})

// 监听类别变化，自动调整分数范围
watch(() => form.value.category, (newCategory) => {
  if (newCategory === '违纪') {
    if (form.value.score > 0) form.value.score = -form.value.score
  } else {
    if (form.value.score < 0) form.value.score = -form.value.score
  }
})

const rules = {
  category: [
    { required: true, message: '请选择类别', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 10, message: '长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' },
    { max: 100, message: '最多输入100个字符', trigger: 'blur' }
  ],
  score: [
    { required: true, message: '请输入分数', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (form.value.category === '违纪' && value >= 0) {
          callback(new Error('违纪行为分数必须为负数'))
        } else if (form.value.category === '优秀' && value <= 0) {
          callback(new Error('优秀表现分数必须为正数'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 分类后的行为类型
const violationTypes = computed(() => {
  return behaviorTypes.value.filter(type => type.category === '违纪')
})

const excellentTypes = computed(() => {
  return behaviorTypes.value.filter(type => type.category === '优秀')
})

// 获取行为类型列表
const fetchBehaviorTypes = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/behaviorTypes')
    behaviorTypes.value = response.data
  } catch (error) {
    console.error('获取行为类型失败:', error)
    ElMessage.error('获取行为类型失败')
  } finally {
    loading.value = false
  }
}

// 添加行为类型
const handleAdd = () => {
  form.value = {
    id: null,
    category: activeTab.value,
    name: '',
    description: '',
    score: activeTab.value === '违纪' ? -1 : 1
  }
  dialogVisible.value = true
}

// 编辑行为类型
const handleEdit = (row) => {
  form.value = {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    score: row.score
  }
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    submitting.value = true
    if (form.value.id) {
      // 编辑
      await axios.put(`/api/behaviorTypes/${form.value.id}`, form.value)
      ElMessage.success('更新成功')
    } else {
      // 新增
      await axios.post('/api/behaviorTypes', form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchBehaviorTypes()
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

// 删除行为类型
const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这个行为类型吗？删除后不可恢复。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await axios.delete(`/api/behaviorTypes/${row.id}`)
        ElMessage.success('删除成功')
        fetchBehaviorTypes()
      } catch (error) {
        if (error.response?.data?.message) {
          ElMessage.error(error.response.data.message)
        } else {
          console.error('删除行为类型失败:', error)
          ElMessage.error('删除失败')
        }
      }
    })
    .catch(() => {})
}

onMounted(() => {
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-input-number .el-input__wrapper) {
  width: 100%;
}
</style> 