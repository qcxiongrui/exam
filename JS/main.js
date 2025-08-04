// 工具模块
import './utils/format.js';

// 核心功能模块
import './modules/dom.js';
import './modules/log.js';
import './modules/gradingLogic.js';
import './modules/examRender.js';
import './modules/examManagement.js';
import './modules/results.js';
import './modules/config.js';

// 全局考试数据变量
// let exams = [];

// 并行加载所有数据资源
window.appData = {};
Promise.all([
  fetch('/data/exams.json').then(r => r.json()),
  fetch('/data/answers.json').then(r => r.json()),
  fetch('/data/results.json').then(r => r.json()),
  fetch('/data/users.json').then(r => r.json())
  // fetch('/data/grading.json').then(r => r.json())
])
  .then(([examsData, answersData, resultsData, userData]) => {
    // 使用模块模式封装全局数据
    window.appData = {
      exams: examsData,
      answers: answersData,
      results: resultsData,
      users: userData,
      // grading: gradingData,
      initialized: true
    };
    // 触发数据加载完成事件
    const event = new Event('appDataLoaded');
    window.dispatchEvent(event);
    // console.log('所有数据加载完成');
    // document.dispatchEvent(new Event('appDataLoaded'));
  })
  .catch(error => {
    console.error('数据加载失败:', error);
    showActionMessage('核心数据加载失败', true);
  });