import { showActionMessage } from '../utils/format.js';
import { renderExamCards } from './examRender.js';
import { renderManagementTable } from './examManagement.js';
import { renderResultsTable } from './results.js';
import { renderGradingTable } from './gradingLogic.js';
import { decryptData, ENCRYPTION_KEY } from '../utils/helpers.js';
import { getElement } from '../modules/dom.js';

// let window.currentUser= {};
// 登录功能
// 移除全局页面元素变量，使用直接DOM查询

// 用户登录功能
export function login() {
  // 直接查询并验证页面元素
  const loginPage = document.getElementById('loginPage');
  const mainSystem = document.getElementById('mainSystem');
  if (!loginPage || !mainSystem) {
    showActionMessage('页面元素加载失败，请刷新页面重试', true);
    return;
  }
  fetch('../../data/users.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      // 标准化用户数据格式
      let usersArray;
      if (Array.isArray(data)) {
        usersArray = data;
      } else if (data?.users && Array.isArray(data.users)) {
        usersArray = data.users;
      } else if (typeof data === 'object' && data !== null) {
        usersArray = Object.values(data);
      } else {
        throw new Error('用户数据格式无效 - 预期数组或包含users数组的对象');
      }
      return usersArray;
    })
    .then(users => {
      // 重新检查页面元素，确保DOM未被修改
      // 直接查询并验证页面元素
      const loginPage = document.getElementById('loginPage');
      const mainSystem = document.getElementById('mainSystem');
      if (!loginPage || !mainSystem) {
        showActionMessage('页面元素加载失败，请刷新页面重试', true);
        return;
      }
      // 标准化输入
      // 直接使用document.getElementById获取元素，确保正确获取
      const employeeId = document.getElementById('employeeId')?.value.trim() || '';
      const password = document.getElementById('password')?.value.trim() || '';
      if (!employeeId || !password) {
        showActionMessage('请输入工号和密码', true);
        return;
      }

      // console.log('Final check before find - users type:', Object.prototype.toString.call(users));
      // console.log('Final check before find - users value:', users);
      if (!Array.isArray(users)) {
        console.error('Critical error: users is not an array before find call');
        throw new Error('users is not an array before find call');
      }
      const user = users.find(u => u.id === employeeId && decryptData(u.password, ENCRYPTION_KEY) === password);
      // console.log(user.password);
      // console.log('Find result:', user);
      if (user) { //true || user
        // localStorage.setItem('currentUser', JSON.stringify(user));
        // 设置当前用户
        // console.log(user)
        window.currentUser = user;
        showActionMessage('登录成功', false);
        // 最终安全检查 - 确保页面元素存在
        // 直接查询并验证页面元素
        const loginPage = document.getElementById('loginPage');
        const mainSystem = document.getElementById('mainSystem');
        if (!loginPage || !mainSystem) {
          showActionMessage('页面元素加载失败，请刷新页面重试', true);
          return;
        }
        // 移除重定向，使用页面切换逻辑
        // 立即切换页面，无需延迟
        // 直接查询DOM元素避免作用域问题
        const loginPageEl = document.getElementById('loginPage');
        const mainSystemEl = document.getElementById('mainSystem');
        if (loginPageEl && mainSystemEl) {
          loginPageEl.style.display = 'none';
          mainSystemEl.style.display = 'block';
        } else {
          showActionMessage('页面元素未找到，请检查页面结构', true);
          return;
        }
      } else {
        showActionMessage('工号或密码错误', true);
        return;
      }

      const currentUserEl = document.getElementById('currentUser');
      const employeeIdDisplay = document.getElementById('employeeIdDisplay');
      const currentRoleEl = document.getElementById('currentRole');

      // 更新UI
      currentUserEl.textContent = window.currentUser.name;
      employeeIdDisplay.textContent = window.currentUser.id;
      currentRoleEl.textContent = window.currentUser.role === 'student' ? '考生' : window.currentUser.role === 'teacher' ? '教师' : '管理员';

      // 切换页面
      // 直接查询DOM元素并检查存在性
      const loginPageEl = document.getElementById('loginPage');
      const mainSystemEl = document.getElementById('mainSystem');
      if (!loginPageEl || !mainSystemEl) {
        showActionMessage('页面元素加载失败，请检查页面结构', true);
        return;
      }
      loginPageEl.style.display = 'none';
      mainSystemEl.style.display = 'block';

      // 根据角色更新导航菜单
      updateMenuForRole();

      // 初始化系统功能
      // 等待results数据加载完成后执行
      function renderWithResults() {
        // 确保exams数据存在后再渲染
        if (!window.appData || !window.appData.exams) {
          showActionMessage('考试数据加载失败，请刷新页面重试', true);
          return;
        }
        // 双重验证exams数据存在性
        if (!window.appData || !Array.isArray(window.appData.exams)) {
          console.error('考试数据格式错误:', window.appData);
          showActionMessage('考试数据加载失败，请刷新页面重试', true);
          return;
        }
        renderExamCards(users, window.appData.exams);      // 使用appData确保数据已加载
        renderGradingTable();
        renderManagementTable();
        renderResultsTable();   //loadAndRenderResults(); 
      }

      // 确保exams数据存在后再渲染
      if (!window.appData || !window.appData.exams) {
        showActionMessage('考试数据加载失败，请刷新页面重试', true);
        return;
      }

      // 使用统一的数据加载完成事件
      if (window.appData) {
        renderWithResults();
      } else {
        document.addEventListener('appDataLoaded', renderWithResults);
      }
      // 已移至renderWithResults函数内执行
      // renderManagementTable();
      // renderResultsTable();
    }).catch(error => {
      console.error('Failed to load users data:', error);
      showActionMessage('用户数据加载失败，请刷新页面重试', true);
    });
}

// 退出功能
export function logout() {
  // 直接查询DOM元素避免全局变量依赖
  const loginPageEl = document.getElementById('loginPage');
  const mainSystemEl = document.getElementById('mainSystem');
  if (!loginPageEl || !mainSystemEl) {
    showActionMessage('页面元素未找到，请检查页面结构', true);
    return;
  }
  // 清空表单
  document.getElementById('employeeId').value = '';
  document.getElementById('password').value = '';
  // document.getElementById('username').value = '';

  // 移除localStorage中的用户
  localStorage.removeItem('currentUser');

  // 切换页面
  document.getElementById('mainSystem').style.display = 'none';
  document.getElementById('loginPage').style.display = 'block';
}

// 根据角色更新菜单
function updateMenuForRole() {
  // currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!window.currentUser) return;
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');
  const examsNav = document.querySelector('.nav-item[data-section="exams"]');
  const gradingNav = document.querySelector('.nav-item[data-section="grading"]');
  const managementNav = document.querySelector('.nav-item[data-section="management"]');
  const resultsNav = document.querySelector('.nav-item[data-section="results"]');
  const configNav = document.querySelector('.nav-item[data-section="config"]');

  // 考生：只显示我的考试和成绩公示
  // console.log(currentUser.role);
  if (window.currentUser.role === 'student') {
    examsNav.style.display = 'block';
    gradingNav.style.display = 'none';
    managementNav.style.display = 'none';
    configNav.style.display = 'none';
    resultsNav.style.display = 'block';
    // 控制系统配置菜单显示
    // const configNav = document.querySelector('.nav-item[onclick*="config.html"]');
    // if (configNav) {
    //     configNav.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    // }

    // 默认激活我的考试
    navItems.forEach(i => i.classList.remove('active'));
    examsNav.classList.add('active');

    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('examsSection').classList.add('active');
  }
  // 教师：只显示批改试卷和成绩公示
  else if (window.currentUser.role === 'teacher') {
    examsNav.style.display = 'none';
    gradingNav.style.display = 'block';
    managementNav.style.display = 'none';
    resultsNav.style.display = 'block';
    configNav.style.display = 'none';

    // 默认激活批改试卷
    navItems.forEach(i => i.classList.remove('active'));
    gradingNav.classList.add('active');

    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('gradingSection').classList.add('active');
  }
  // 管理员：显示所有菜单
  else {
    examsNav.style.display = 'block';
    gradingNav.style.display = 'block';
    managementNav.style.display = 'block';
    resultsNav.style.display = 'block';
    configNav.style.display = 'block';

    // 默认激活考试管理
    navItems.forEach(i => i.classList.remove('active'));
    managementNav.classList.add('active');

    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('managementSection').classList.add('active');
  }
}