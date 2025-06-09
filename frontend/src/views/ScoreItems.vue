<template>
  <div class="score-items-container">
    <div class="header">
      <h2>加减分项管理</h2>
      <el-button type="primary" @click="handleAdd">
        添加分项
      </el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="加分项" name="加分">
        <el-table :data="positiveItems" style="width: 100%" v-loading="loading">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="score" label="分数" width="120">
            <template #default="scope">
              <el-tag type="success" size="small">
                +{{ scope.row.score }}
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

      <el-tab-pane label="减分项" name="减分">
        <el-table :data="negativeItems" style="width: 100%" v-loading="loading">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="score" label="分数" width="120">
            <template #default="scope">
              <el-tag type="danger" size="small">
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

    <!-- 添加/编辑分项对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑分项' : '添加分项'"
      width="500px"
    >
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" placeholder="请选择类别" style="width: 100%">
            <el-option label="加分" value="加分" />
            <el-option label="减分" value="减分" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分项名称" />
        </el-form-item>
        <el-form-item label="分数" prop="score">
          <el-input-number 
            v-model="form.score" 
            :min="-100"
            :max="100"
            :step="0.5"
            style="width: 100%"
            :controls="false"
            :placeholder="form.category === '减分' ? '请输入扣分分数（负数）' : '请输入加分分数（正数）'"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分项描述"
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
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 状态变量
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const activeTab = ref('加分')
const items = ref([])
const formRef = ref(null)

// 表单数据
const form = ref({
  id: null,
  category: '',
  name: '',
  score: 0,
  description: ''
})

// 监听类别变化，自动调整分数范围
watch(() => form.value.category, (newCategory) => {
  if (newCategory === '减分') {
    if (form.value.score > 0) form.value.score = -form.value.score
  } else {
    if (form.value.score < 0) form.value.score = -form.value.score
  }
})

// 表单验证规则
const rules = {
  category: [
    { required: true, message: '请选择类别', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' },
    { max: 200, message: '最多输入200个字符', trigger: 'blur' }
  ],
  score: [
    { required: true, message: '请输入分数', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (form.value.category === '减分' && value >= 0) {
          callback(new Error('减分项分数必须为负数'))
        } else if (form.value.category === '加分' && value <= 0) {
          callback(new Error('加分项分数必须为正数'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 分类后的分项
const positiveItems = computed(() => {
  return items.value.filter(item => item.category === '加分')
})

const negativeItems = computed(() => {
  return items.value.filter(item => item.category === '减分')
})

// 获取分项列表
const fetchItems = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/score-items')
    items.value = response.data
  } catch (error) {
    console.error('获取分项列表失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 添加分项
const handleAdd = () => {
  form.value = {
    id: null,
    category: activeTab.value,
    name: '',
    description: '',
    score: activeTab.value === '减分' ? -1 : 1
  }
  dialogVisible.value = true
}

// 编辑分项
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
      await axios.put(`/api/score-items/${form.value.id}`, form.value)
      ElMessage.success('更新成功')
    } else {
      // 新增
      await axios.post('/api/score-items', form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchItems()
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

// 删除分项
const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这个分项吗？删除后不可恢复。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await axios.delete(`/api/score-items/${row.id}`)
        ElMessage.success('删除成功')
        fetchItems()
      } catch (error) {
        if (error.response?.data?.message) {
          ElMessage.error(error.response.data.message)
        } else {
          console.error('删除分项失败:', error)
          ElMessage.error('删除失败')
        }
      }
    })
    .catch(() => {})
}

onMounted(() => {
  fetchItems()
})
</script>

<style scoped>
.score-items-container {
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