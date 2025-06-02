<template>
  <div class="account-management">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>账户管理</span>
          <el-button type="primary" @click="handleAdd">添加用户</el-button>
        </div>
      </template>

      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'success'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录时间" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" type="primary" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button
                size="small"
                :type="row.status === 'active' ? 'warning' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'active' ? '禁用' : '启用' }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDelete(row)"
                :disabled="row.role === 'admin'"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        style="max-width: 460px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="dialogType === 'edit'" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item 
          label="密码" 
          prop="password"
          v-if="dialogType === 'add'"
        >
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        
        <!-- 修改密码部分 -->
        <div v-if="dialogType === 'edit'" class="password-section">
          <el-divider>修改密码（可选）</el-divider>
          <el-form-item label="新密码" prop="newPassword">
            <el-input 
              v-model="form.newPassword" 
              type="password" 
              show-password
              placeholder="不修改请留空"
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input 
              v-model="form.confirmPassword" 
              type="password" 
              show-password
              placeholder="不修改请留空"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const loading = ref(false)
const users = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)

const form = ref({
  id: '',
  username: '',
  password: '',
  role: 'user',
  newPassword: '',
  confirmPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur', validator: (rule, value, callback) => {
      if (dialogType.value === 'add' && !value) {
        callback(new Error('请输入密码'))
      } else {
        callback()
      }
    }},
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  newPassword: [
    { validator: (rule, value, callback) => {
      if (value && value.length < 6) {
        callback(new Error('密码长度不能小于6个字符'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: (rule, value, callback) => {
      if (form.value.newPassword && value !== form.value.newPassword) {
        callback(new Error('两次输入密码不一致'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

const fetchUsers = async () => {
  console.log('=== 开始获取用户列表 ===')
  loading.value = true
  try {
    console.log('发送请求前的token:', localStorage.getItem('token'))
    const response = await request.get('/api/users')
    console.log('获取用户列表原始响应:', response)
    
    // 检查响应格式
    if (Array.isArray(response)) {
      users.value = response
      console.log('用户列表数据已更新, 数量:', users.value.length)
      console.log('用户列表详细数据:', JSON.stringify(users.value, null, 2))
    } else {
      console.warn('响应格式异常, 期望数组但收到:', typeof response)
      ElMessage.warning('获取用户列表数据格式异常')
    }
  } catch (error) {
    console.error('获取用户列表失败:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    })
    ElMessage.error(error.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
    console.log('=== 获取用户列表结束 ===')
  }
}

const handleAdd = () => {
  console.log('=== 开始添加用户 ===')
  dialogType.value = 'add'
  form.value = {
    id: '',
    username: '',
    password: '',
    role: 'user',
    newPassword: '',
    confirmPassword: ''
  }
  console.log('重置表单数据:', form.value)
  dialogVisible.value = true
}

const handleEdit = (row) => {
  console.log('=== 开始编辑用户 ===')
  console.log('待编辑的用户数据:', row)
  dialogType.value = 'edit'
  form.value = {
    id: row.id,
    username: row.username,
    role: row.role,
    password: '',
    newPassword: '',
    confirmPassword: ''
  }
  console.log('表单已填充数据:', form.value)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  console.log('=== 开始提交表单 ===')
  console.log('表单数据:', form.value)
  console.log('操作类型:', dialogType.value)
  
  if (!formRef.value) {
    console.warn('表单引用不存在')
    return
  }
  
  try {
    const valid = await formRef.value.validate()
    console.log('表单验证结果:', valid)
    
    if (valid) {
      try {
        let response
        const formData = {
          username: form.value.username,
          role: form.value.role
        }

        if (dialogType.value === 'add') {
          formData.password = form.value.password
          console.log('发送添加用户请求:', formData)
          response = await request.post('/api/users', formData)
          console.log('添加用户响应:', response)
          ElMessage.success('添加用户成功')
        } else {
          if (form.value.newPassword) {
            formData.newPassword = form.value.newPassword
          }
          console.log('发送更新用户请求:', {
            id: form.value.id,
            data: formData
          })
          response = await request.put(`/api/users/${form.value.id}`, formData)
          console.log('更新用户响应:', response)
          ElMessage.success('更新用户成功')
        }
        dialogVisible.value = false
        await fetchUsers()
      } catch (error) {
        console.error('操作失败:', {
          type: dialogType.value,
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        ElMessage.error(error.response?.data?.message || (dialogType.value === 'add' ? '添加用户失败' : '更新用户失败'))
      }
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    console.log('=== 提交表单结束 ===')
  }
}

const handleToggleStatus = async (row) => {
  console.log('=== 开始切换用户状态 ===')
  console.log('目标用户:', row)
  console.log('当前状态:', row.status)
  
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active'
    console.log('切换到新状态:', newStatus)
    
    const response = await request.patch(`/api/users/${row.id}/status`, {
      status: newStatus
    })
    console.log('状态更新响应:', response)
    
    ElMessage.success('更新状态成功')
    await fetchUsers()
  } catch (error) {
    console.error('更新状态失败:', {
      userId: row.id,
      error: error.message,
      response: error.response?.data
    })
    ElMessage.error('更新状态失败')
  } finally {
    console.log('=== 切换用户状态结束 ===')
  }
}

const handleDelete = (row) => {
  console.log('=== 开始删除用户 ===')
  console.log('待删除用户:', row)
  
  ElMessageBox.confirm('确认删除该用户？此操作不可恢复', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        console.log('发送删除请求:', row.id)
        const response = await request.delete(`/api/users/${row.id}`)
        console.log('删除响应:', response)
        
        ElMessage.success('删除用户成功')
        await fetchUsers()
      } catch (error) {
        console.error('删除失败:', {
          userId: row.id,
          error: error.message,
          response: error.response?.data
        })
        ElMessage.error('删除用户失败')
      } finally {
        console.log('=== 删除用户结束 ===')
      }
    })
    .catch(() => {
      console.log('用户取消删除操作')
    })
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.account-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.password-section {
  margin-top: 20px;
}

.el-divider {
  margin: 16px 0;
}
</style> 
</style> 