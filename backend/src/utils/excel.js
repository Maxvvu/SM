const ExcelJS = require('exceljs');
const { logger } = require('./logger');

async function createStudentTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('学生信息');

  // 设置列
  worksheet.columns = [
    { header: '姓名', key: 'name', width: 15 },
    { header: '学号', key: 'student_id', width: 15 },
    { header: '年级', key: 'grade', width: 10 },
    { header: '班级', key: 'class', width: 10 },
    { header: '班主任', key: 'teacher', width: 15 },
    { header: '状态', key: 'status', width: 12 },
    { header: '地址', key: 'address', width: 30 },
    { header: '紧急联系人', key: 'emergency_contact', width: 15 },
    { header: '紧急联系电话', key: 'emergency_phone', width: 15 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  // 设置表头样式
  worksheet.getRow(1).font = {
    bold: true,
    size: 12
  };
  worksheet.getRow(1).alignment = {
    vertical: 'middle',
    horizontal: 'center'
  };

  // 添加示例数据
  worksheet.addRow({
    name: '张三（示例）',
    student_id: 'S001',
    grade: '高一',
    class: '1班',
    teacher: '李老师',
    status: '正常',
    address: '北京市海淀区XX街XX号',
    emergency_contact: '张父',
    emergency_phone: '13800138000',
    notes: '这是一条示例数据，年级可以填写"高一"、"高二"、"高三"或"YYYY级"格式'
  });

  // 添加第二个示例
  worksheet.addRow({
    name: '李四（示例）',
    student_id: 'S002',
    grade: '2024级',
    class: '2班',
    teacher: '王老师',
    status: '警告',
    address: '北京市朝阳区XX路XX号',
    emergency_contact: '李母',
    emergency_phone: '13900139000',
    notes: ''
  });

  // 设置年级说明
  worksheet.getCell('C1').note = {
    texts: [{
      text: '可以填写：\n1. 高一、高二、高三\n2. YYYY级（如：2024级）',
      font: {
        size: 12,
        color: { argb: 'FF0000FF' }
      }
    }]
  };

  // 设置状态说明
  worksheet.getCell('F1').note = {
    texts: [{
      text: '可选值：\n正常、警告、严重警告、记过、留校察看、勒令退学、开除学籍',
      font: {
        size: 12,
        color: { argb: 'FF0000FF' }
      }
    }]
  };

  // 冻结表头
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  return workbook;
}

module.exports = {
  createStudentTemplate
}; 