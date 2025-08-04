import { login, logout } from './log.js';
import { showActionMessage } from '../utils/format.js';
import { submitGrading, closeGradingModal } from './gradingLogic.js';
import { initExamEvents } from './examRender.js';
import { openCreateExamModal, saveExam, closeExamModal, closeAllModals } from './examManagement.js';
import { openImportModal, handleFileSelect, importQuestions, closeImportModal, setupDragAndDrop } from './importQuestions.js';
import { initNavigation } from './navigation.js';
// console.log('Login import started at', new Date().toISOString());
// console.log('Login function imported status:', typeof login);
if (typeof login !== 'function') {
    console.error('Critical error: login function not imported correctly. Type:', typeof login);
    console.error('Import path:', './log.js');
}

// 当前用户信息
// let currentUser = null;
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

let timerInterval = null;
let timeRemaining = 0;
// window.currentQuestionIndex = 0;  // 定义全局变量 currentQuestionIndex
// let startTime = null;
let currentGradingPaper = null;// 当前批改的试卷
let currentImportQuestions = [];

// DOM 元素缓存
const domElements = {
    // 页面容器
    mainSystem: document.getElementById('mainSystem'),
    loginPage: document.getElementById('loginPage'),

    // 用户信息
    currentUserEl: document.getElementById('currentUser'),
    employeeIdDisplay: document.getElementById('employeeIdDisplay'),
    currentRoleEl: document.getElementById('currentRole'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    // 考试模态框
    examModal: document.getElementById('examModal'),
    modalTitle: document.getElementById('modalTitle'),
    examForm: document.getElementById('examForm'),
    saveExamBtn: document.getElementById('saveExamBtn'),
    cancelExamBtn: document.getElementById('cancelExamBtn'),
    closeModalBtn: document.querySelectorAll('.close-modal'),
    createExamBtn: document.getElementById('createExamBtn'),

    // 导入模态框
    importQuestionsBtn: document.getElementById('importQuestionsBtn'),
    importModal: document.getElementById('importModal'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    importBtn: document.getElementById('importBtn'),
    cancelImportBtn: document.getElementById('cancelImportBtn'),
    uploadArea: document.getElementById('uploadArea'),
    previewContainer: document.getElementById('previewContainer'),
    questionPreview: document.getElementById('questionPreview'),

    // 其他元素
    actionMessage: document.getElementById('actionMessage'),
    serverModeToggle: document.getElementById('serverModeToggle'),
    examTimer: document.getElementById('examTimer'),
    timeRemainingEl: document.getElementById('timeRemaining'),
    questionContainer: document.getElementById('questionContainer'),
    pagination: document.getElementById('pagination'),
    prevQuestionBtn: document.getElementById('prevQuestionBtn'),
    nextQuestionBtn: document.getElementById('nextQuestionBtn'),
    submitExamBtn: document.getElementById('submitExamBtn'),
    currentExamTitle: document.getElementById('currentExamTitle'),
    progressFill: document.getElementById('progressFill'),
    progressValue: document.getElementById('progressValue'),
    backToExamsBtn: document.getElementById('backToExamsBtn'),
    finalScore: document.getElementById('finalScore'),
    totalQuestions: document.getElementById('totalQuestions'),
    answeredQuestions: document.getElementById('answeredQuestions'),
    correctAnswers: document.getElementById('correctAnswers'),
    examTime: document.getElementById('examTime'),

    // 批改相关
    studentName: document.getElementById('studentName'),
    employeeIdEl: document.getElementById('userId'),
    examNameEl: document.getElementById('examNameG'),
    examDuration: document.getElementById('examDurationG'),
    objectiveScore: document.getElementById('objectiveScore'),
    gradingModal: document.getElementById('gradingModal')
};

// 安全获取DOM元素的辅助函数
export function getElement(key) {
    if (!domElements[key]) {
        console.warn(`DOM元素未找到: ${key}`);
        // 尝试重新获取
        domElements[key] = document.getElementById(key) || document.querySelector(`.${key}`);
    }
    return domElements[key];
}

// 初始化函数document.addEventListener()向文档添加事件句柄，当初始HTML文档(DOM文档结构)已完全加载和解析时，将触发DOMContentLoaded事件
document.addEventListener('DOMContentLoaded', function () {
    // console.log('DOMContentLoaded - checking login function:', typeof login);

    initLoginFunctionality();

    function initLoginFunctionality() {
        // 获取登录和退出按钮元素
        // 检测登录状态
        const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
        if (isLoggedIn) {
            document.body.classList.add('logged-in');
            document.body.classList.remove('login-page');
        } else {
            document.body.classList.remove('logged-in');
            document.body.classList.add('login-page');
        }

        // 初始化导航功能 导航菜单点击
        initNavigation();

        // 在数据加载完成后控制成绩公示内容显示
        document.addEventListener('appDataLoaded', function () {
            const isResultsPage = !!document.getElementById('resultsPageMarker');
            const chartContainer = document.querySelector('.chart-container');
            // 增强成绩排名内容检测与隐藏
            const rankElements = document.querySelectorAll('.rank-container, #scoreRankings, [data-component="score-ranking"], .score-table-container, .exam-rankings, .ranking-content, #rankingsContainer, .results-table, .score-rankings, .exam-results-table, .ranking-section, #rankingContainer, [data-view="rankings"], .scores-table, .exam-ranking-container, .rank-list, .ranking-display, #examScores, [class*="ranking"], [data-type="score-list"], [class*="score"], [class*="rank"], [id*="score"], [id*="rank"], [data-component*="score"], .table-rank, .rank-table, .score-list-container');

            // 检测并隐藏排名标题（使用vanilla JS替代:contains选择器）
            const headings = document.querySelectorAll('h1, h2, h3, h4');
            const rankingTitle = Array.from(headings).find(heading =>
                heading.textContent.includes('考试成绩排名') ||
                heading.textContent.includes('成绩排名')
            );

            if (!isResultsPage) {
                // 隐藏图表容器
                if (chartContainer) chartContainer.style.display = 'none';

                // 隐藏所有排名相关容器
                rankElements.forEach(el => el.style.display = 'none');

                // 隐藏排名标题
                if (rankingTitle) rankingTitle.style.display = 'none';

                // 额外隐藏表格标题行（修复:contains选择器兼容性问题）
                const rankHeaders = Array.from(document.querySelectorAll('th')).find(th =>
                    th.textContent.includes('排名')
                );
                if (rankHeaders) {
                    const rankTableHeaders = rankHeaders.closest('tr');
                    if (rankTableHeaders) rankTableHeaders.style.display = 'none';
                }
            }
        });

        // 考试管理功能
        // 使用事件委托优化事件监听
        document.addEventListener('click', function (e) {
            if (e.target.closest('#createExamBtn')) {
                openCreateExamModal();
            } else if (e.target.closest('#saveExamBtn')) {
                saveExam();
            } else if (e.target.closest('#cancelExamBtn')) {
                closeExamModal();
            } else if (e.target.closest('.close-modal')) {
                closeAllModals();
            } else if (e.target.closest('#importQuestionsBtn')) {
                openImportModal();
            } else if (e.target.closest('#selectFileBtn')) {
                getElement('fileInput').click();
            } else if (e.target.closest('#importBtn')) {
                importQuestions();
            } else if (e.target.closest('#cancelImportBtn')) {
                closeImportModal();
            } else if (e.target.closest('#submitGradingBtn')) {
                submitGrading();
            } else if (e.target.closest('#cancelGradingBtn')) {
                closeGradingModal();
            }
        });

        // 文件输入变化事件
        // if (getElement('fileInput')) {
        //     getElement('fileInput').addEventListener('change', handleFileSelect);
        // }

        // 拖放功能
        setupDragAndDrop();

        // 点击模态框外部关闭
        window.addEventListener('click', function (event) {
            if (event.target === examModal) closeExamModal();
            if (event.target === importModal) closeImportModal();
        });

        // 考试功能初始化
        initExamEvents();
    }

    const logoutBtn = document.getElementById('logoutBtn');

    // 登录按钮检查已移至前面的DOM元素缓存部分
    // 登录按钮
    loginBtn.addEventListener('click', function () {
        if (typeof login === 'function') {
            login();
        } else {
            console.error('登录函数尚未加载完成，请稍候重试');
            showActionMessage('系统正在初始化，请稍候...', 'warning');
        }
    });

    // 退出按钮
    logoutBtn.addEventListener('click', logout);

    // 设置登录状态类
    // 更可靠的登录状态检测
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    // 基于页面类型和登录状态控制页脚显示

    // 添加/移除登录页面标识类
    if (loginBtn) {
        document.body.classList.add('login-page');
        // console.log('已添加login-page类到body');
        // console.log('检测到登录按钮 - 添加login-page类');
    }
}
)
initNavigation();

// 考试管理功能
createExamBtn.addEventListener('click', openCreateExamModal);
// saveExamBtn.addEventListener('click', saveExam);//保存考试 - 已注释，避免重复调用
cancelExamBtn.addEventListener('click', closeExamModal);
// 使用安全的方式获取closeModalBtn元素
const closeModalBtns = getElement('closeModalBtn');
if (closeModalBtns && closeModalBtns.forEach) {
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
} else if (closeModalBtns) {
    // 如果只找到一个元素
    closeModalBtns.addEventListener('click', closeAllModals);
} else {
    console.warn('未找到关闭模态框按钮');
}

// 导入试题功能
importQuestionsBtn.addEventListener('click', openImportModal);
// selectFileBtn.addEventListener('click', () => fileInput.click());//重复，已注释
// fileInput.addEventListener('change', handleFileSelect);//导入题库浏览
// fileInput.addEventListener('click', handleFileSelect);
importBtn.addEventListener('click', importQuestions);//确认导入
cancelImportBtn.addEventListener('click', closeImportModal);

// 拖放功能
setupDragAndDrop();

// 点击模态框外部关闭
window.addEventListener('click', function (event) {
    if (event.target === examModal) {
        closeExamModal();
    }
    if (event.target === importModal) {
        closeImportModal();
    }
});

// 考试功能初始化
initExamEvents();

// 添加批改试卷事件绑定
document.getElementById('submitGradingBtn').addEventListener('click', submitGrading);
document.getElementById('cancelGradingBtn').addEventListener('click', closeGradingModal);
document.querySelector('.close-modal').addEventListener('click', closeGradingModal);

// // 服务器模式提示
// function showServerModeMessage(e) {
//     e.preventDefault();
//     showActionMessage('服务器模式将在部署后启用，当前使用本地数据');
// }