const generateRandomName = () => {
  const familyNames = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '吴', '周'];
  const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军'];
  return familyNames[Math.floor(Math.random() * familyNames.length)] + 
         givenNames[Math.floor(Math.random() * givenNames.length)];
};

const generateRandomPhone = () => {
  return '1' + ['3', '5', '7', '8', '9'][Math.floor(Math.random() * 5)] + 
         Array(9).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
};

const generateRandomAddress = () => {
  const provinces = ['北京市', '上海市', '广东省', '江苏省', '浙江省'];
  const cities = ['市辖区', '朝阳区', '海淀区', '浦东新区', '天河区'];
  const streets = ['中心路', '人民路', '建设路', '和平路', '友谊路'];
  const numbers = ['88号', '66号', '128号', '168号', '198号'];
  
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const number = numbers[Math.floor(Math.random() * numbers.length)];
  
  return `${province}${city}${street}${number}`;
};

const generateMockStudents = (count) => {
  const students = [];
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  const classes = ['1班', '2班', '3班', '4班'];

  for (let i = 0; i < count; i++) {
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const className = classes[Math.floor(Math.random() * classes.length)];
    const name = generateRandomName();
    
    students.push({
      name,
      student_id: `${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
      grade,
      class: className,
      address: generateRandomAddress(),
      emergency_contact: generateRandomName(),
      emergency_phone: generateRandomPhone(),
      notes: `${name}的基本信息`,
      photo_url: null // 由于是模拟数据，暂时不添加照片
    });
  }

  return students;
};

const generateRandomBehavior = async (studentIds) => {
  const behaviorTypes = [
    { name: '迟到', category: '违纪' },
    { name: '早退', category: '违纪' },
    { name: '旷课', category: '违纪' },
    { name: '打架', category: '违纪' },
    { name: '不交作业', category: '违纪' },
    { name: '课堂说话', category: '违纪' },
    { name: '使用手机', category: '违纪' },
    { name: '违反着装规定', category: '违纪' }
  ];

  const getRandomDate = () => {
    const start = new Date(2024, 0, 1); // 2024年1月1日
    const end = new Date();
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
      .toISOString().slice(0, 19).replace('T', ' ');
  };

  const generateDescription = (type) => {
    const times = ['上午', '下午'];
    const locations = ['教室', '操场', '走廊', '食堂', '图书馆'];
    const time = times[Math.floor(Math.random() * times.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    switch(type) {
      case '迟到':
        return `${time}上课迟到15分钟`;
      case '早退':
        return `${time}课程提前离开教室`;
      case '旷课':
        return `${time}未到校上课`;
      case '打架':
        return `在${location}与同学发生肢体冲突`;
      case '不交作业':
        return `连续两天未完成作业`;
      case '课堂说话':
        return `${time}课堂上大声喧哗`;
      case '使用手机':
        return `在${location}使用手机玩游戏`;
      case '违反着装规定':
        return `未按规定穿着校服`;
      default:
        return `在${location}违反校规`;
    }
  };

  const behaviors = [];
  for (let i = 0; i < 100; i++) {
    const behaviorType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
    const studentId = studentIds[Math.floor(Math.random() * studentIds.length)];
    
    behaviors.push({
      student_id: studentId,
      behavior_type: behaviorType.name,
      description: generateDescription(behaviorType.name),
      date: getRandomDate(),
      image_url: null
    });
  }

  return behaviors;
};

module.exports = {
  generateMockStudents,
  generateRandomBehavior
}; 