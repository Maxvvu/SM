const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'backend/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，请上传Excel文件(.xlsx或.xls)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

exports.importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel文件中没有数据' });
    }

    const errors = [];
    const validData = [];

    // 验证每行数据
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = validateStudentData(row, i + 2); // Excel行号从2开始（1是表头）
      
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validData.push(row);
      }
    }

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    if (errors.length > 0) {
      return res.status(400).json({
        message: '导入数据有误',
        errors: errors,
        success: validData.length
      });
    }

    // TODO: 将validData保存到数据库
    // 这里需要添加数据库保存逻辑

    return res.json({
      message: '导入成功',
      success: validData.length
    });

  } catch (error) {
    console.error('导入失败:', error);
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: '服务器错误，导入失败' });
  }
};

function validateStudentData(row, rowNumber) {
  const errors = [];
  
  // 检查必填字段
  const requiredFields = ['姓名', '学号', '年级', '班级', '班主任'];
  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push(`第${rowNumber}行：${field}不能为空`);
    }
  }

  // 验证学号格式（只允许字母和数字）
  if (row['学号'] && !/^[A-Za-z0-9]+$/.test(row['学号'])) {
    errors.push(`第${rowNumber}行：学号只能包含字母和数字`);
  }

  // 验证年级格式
  if (row['年级']) {
    const gradePattern = /^(高一|高二|高三|\d{4}级)$/;
    if (!gradePattern.test(row['年级'])) {
      errors.push(`第${rowNumber}行：年级格式不正确（应为"高一"、"高二"、"高三"或"YYYY级"）`);
    }
  }

  // 验证状态值（如果有）
  if (row['状态']) {
    const validStatus = ['正常', '警告', '严重警告', '记过', '留校察看', '勒令退学', '开除学籍'];
    if (!validStatus.includes(row['状态'])) {
      errors.push(`第${rowNumber}行：无效的状态值`);
    }
  }

  return errors;
}

exports.downloadTemplate = (req, res) => {
  const templatePath = path.join(__dirname, '../template.xlsx');
  res.download(templatePath, '学生导入模板.xlsx');
}; 