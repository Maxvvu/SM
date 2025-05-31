const { run, get } = require('../models/database');
const { logger } = require('./logger');

// 生成随机姓名
function generateName() {
  const surnames = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '郑'];
  const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀兰', '霞', '平'];
  
  return surnames[Math.floor(Math.random() * surnames.length)] + 
         names[Math.floor(Math.random() * names.length)];
}

// 生成随机学号
function generateStudentId(index) {
  return `S${String(2024000 + index).padStart(6, '0')}`;
}

// 生成随机年级和班级
function generateGradeAndClass() {
  const grades = ['高一', '高二', '高三'];
  const grade = grades[Math.floor(Math.random() * grades.length)];
  const classNum = Math.floor(Math.random() * 10) + 1;
  return { grade, class: `${classNum}班` };
}

// 生成随机地址
function generateAddress() {
  const cities = ['北京市', '上海市', '广州市', '深圳市'];
  const districts = ['海淀区', '朝阳区', '西城区', '东城区'];
  const streets = ['中关村大街', '建国路', '长安街', '南京路'];
  const numbers = ['1号', '2号', '3号', '4号'];
  
  const city = cities[Math.floor(Math.random() * cities.length)];
  const district = districts[Math.floor(Math.random() * districts.length)];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const number = numbers[Math.floor(Math.random() * numbers.length)];
  
  return `${city}${district}${street}${number}`;
}

// 生成随机联系信息
function generateContact() {
  const relations = ['父亲', '母亲', '爷爷', '奶奶'];
  const surnames = ['张', '李', '王', '刘'];
  const relation = relations[Math.floor(Math.random() * relations.length)];
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  
  return {
    contact: surname + relation,
    phone: `1${Math.floor(Math.random() * 9 + 3)}${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`
  };
}

// 生成随机备注
function generateNotes() {
  const notes = [
    '品学兼优',
    '积极向上',
    '乐于助人',
    '学习认真',
    '体育特长生',
    '音乐特长生',
    '美术特长生',
    '学生干部',
    '三好学生',
    '优秀班干部'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// 生成随机日期
function generateRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function generateTestStudents(count = 100) {
  try {
    for (let i = 0; i < count; i++) {
      const name = generateName();
      const student_id = generateStudentId(i);
      const { grade, class: className } = generateGradeAndClass();
      const address = generateAddress();
      const { contact, phone } = generateContact();
      const notes = generateNotes();

      await run(
        `INSERT INTO students (name, student_id, grade, class, address, emergency_contact, emergency_phone, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, student_id, grade, className, address, contact, phone, notes]
      );

      if (i % 10 === 0) {
        logger.info(`已生成 ${i + 1} 条测试数据`);
      }
    }
    
    logger.info(`成功生成 ${count} 条测试数据`);
  } catch (err) {
    logger.error('生成测试数据失败:', err);
    throw err;
  }
}

// 生成行为记录测试数据
async function generateTestBehaviors(count = 100) {
  try {
    // 获取所有学生
    const students = await get('SELECT id FROM students');
    if (students.length === 0) {
      throw new Error('没有学生数据，请先生成学生测试数据');
    }

    // 获取所有行为类型
    const behaviorTypes = await get('SELECT name, category FROM behavior_types');
    if (behaviorTypes.length === 0) {
      throw new Error('没有行为类型数据');
    }

    // 违纪行为描述模板
    const violationDescriptions = [
      '在课堂上使用手机',
      '未经允许离开教室',
      '上课说话影响他人',
      '迟到超过15分钟',
      '未完成作业',
      '考试作弊',
      '打架斗殴',
      '破坏公物',
      '在教室吃零食',
      '不遵守课堂纪律'
    ];

    // 优秀表现描述模板
    const excellentDescriptions = [
      '帮助同学解决学习困难',
      '主动参与班级活动',
      '积极回答问题',
      '担任班级干部表现优秀',
      '在竞赛中获得奖项',
      '主动清洁教室环境',
      '协助老师完成工作',
      '在社团活动中表现突出',
      '热心帮助他人',
      '遵守校规校纪表现优异'
    ];

    const startDate = new Date('2024-01-01');
    const endDate = new Date();

    for (let i = 0; i < count; i++) {
      // 随机选择学生
      const student = students[Math.floor(Math.random() * students.length)];
      
      // 随机选择行为类型
      const behaviorType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
      
      // 根据行为类型选择描述
      let description;
      if (behaviorType.category === '违纪') {
        description = violationDescriptions[Math.floor(Math.random() * violationDescriptions.length)];
      } else {
        description = excellentDescriptions[Math.floor(Math.random() * excellentDescriptions.length)];
      }

      // 生成随机日期
      const date = generateRandomDate(startDate, endDate);

      await run(
        `INSERT INTO behaviors (student_id, behavior_type, description, date)
         VALUES (?, ?, ?, ?)`,
        [student.id, behaviorType.name, description, date.toISOString()]
      );

      if (i % 10 === 0) {
        logger.info(`已生成 ${i + 1} 条行为记录测试数据`);
      }
    }
    
    logger.info(`成功生成 ${count} 条行为记录测试数据`);
  } catch (err) {
    logger.error('生成行为记录测试数据失败:', err);
    throw err;
  }
}

module.exports = {
  generateTestStudents,
  generateTestBehaviors
}; 