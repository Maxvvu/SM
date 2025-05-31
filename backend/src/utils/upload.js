import request from './request'

/**
 * 获取上传请求的headers
 * @returns {Object} 包含认证token的headers对象
 */
export function getUploadHeaders() {
  const token = localStorage.getItem('token')
  return token ? {
    Authorization: `Bearer ${token}`
  } : {}
}

/**
 * 处理上传前的验证
 * @param {File} file 要上传的文件
 * @returns {boolean|string} 验证通过返回true，否则返回错误消息
 */
export function beforeUpload(file) {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    return '只能上传图片文件！'
  }
  if (!isLt5M) {
    return '图片大小不能超过 5MB！'
  }
  return true
}

/**
 * 创建上传请求配置
 * @param {string} type 上传类型（students/behaviors/general）
 * @returns {Object} 上传配置对象
 */
export function createUploadConfig(type = 'general') {
  return {
    action: `/api/upload?type=${type}`,
    headers: getUploadHeaders(),
    beforeUpload,
    'show-file-list': false
  }
} 