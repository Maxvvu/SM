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
    address: '北京市海淀区XX街XX号',
    emergency_contact: '张父',
    emergency_phone: '13800138000',
    notes: '这是一条示例数据'
  });

  // 设置年级选项
  const gradeOptions = ['高一', '高二', '高三'].join(',');

  // 设置每列的数据验证
  worksheet.dataValidations.add('C2:C1000', {
    type: 'list',
    allowBlank: true,
    formulae: [`"${gradeOptions}"`]
  });

  // 冻结表头
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  return workbook;
}

module.exports = {
  createStudentTemplate
}; 