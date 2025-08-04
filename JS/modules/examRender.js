import { renderGradingTable } from './gradingLogic.js'
import { showActionMessage, formatDateTimeLocal } from '../utils/format.js';
import { saveToFile } from '../utils/helpers.js';
// 导入配置模块
import { Config } from './config.js';

// DOM元素缓存 - 使用懒加载模式
const domCache = {
    get sections() { return document.querySelectorAll('.section'); },
    get examCards() { return document.getElementById('examCards'); },
    get currentExamTitle() { return document.getElementById('currentExamTitle'); },
    get timeRemainingEl() { return document.getElementById('timeRemaining'); },
    get questionContainer() { return document.getElementById('questionContainer'); },
    get pagination() { return document.getElementById('pagination'); },
    get prevQuestionBtn() { return document.getElementById('prevQuestionBtn'); },
    get nextQuestionBtn() { return document.getElementById('nextQuestionBtn'); },
    get submitExamBtn() { return document.getElementById('submitExamBtn'); },
    get backToExamsBtn() { return document.getElementById('backToExamsBtn'); },
    get progressFill() { return document.getElementById('progressFill'); },
    get progressValue() { return document.getElementById('progressValue'); },
    get examTimer() { return document.getElementById('examTimer'); },
    get finalScore() { return document.getElementById('finalScore'); },
    get totalQuestions() { return document.getElementById('totalQuestions'); },
    get answeredQuestions() { return document.getElementById('answeredQuestions'); },
    get correctAnswers() { return document.getElementById('correctAnswers'); },
    get examTime() { return document.getElementById('examTime'); },
    get resultChart() { return document.getElementById('resultChart'); },
    get resultSection() { return document.getElementById('resultSection'); },
    get examsSection() { return document.getElementById('examsSection'); },
};
// 初始化练习模式状态
window.isPracticeMode = localStorage.getItem('practiceMode') === 'true';
// 检查是否处于练习模式
const isPracticeMode = window.isPracticeMode;
let isAllowStudentsViewAnswers = false;

// 模块内部变量
let currentExam = null;
let currentAnswers = {};
let currentQuestionIndex = 0;
let timeRemaining = 0;
let timerInterval = null;
let isExamActive = false;



// 监听练习模式变化事件
document.addEventListener('practiceModeChanged', function (event) {
    window.isPracticeMode = event.detail.isPracticeMode;
    console.log('练习模式状态已变更为:', window.isPracticeMode);
    // 重新渲染考试卡片以更新状态
    renderExamCards();
});

// 辅助函数：安全获取DOM元素
function getElement(key) {
    const element = domCache[key];
    if (!element && key !== 'sections') {
        console.warn(`未找到DOM元素: ${key}`);
    }
    return element;
}

export function renderExamCards() {
    const container = getElement('examCards');
    if (!container) {
        console.error('未找到考试卡片容器');
        return;
    }
    container.innerHTML = ''; // 清空容器
    const scores = [];

    // 等待数据加载完成后执行
    function processResults() {
        if (!window.appData?.results) {
            console.error('成绩数据未加载');
            return;
        }
        window.appData.results.forEach(result => {
            if (result.userId === window.currentUser?.id) {
                scores.push(result);
            }
        });
    }

    // 监听统一数据加载事件
    if (window.appData) {
        processResults();
    } else {
        document.addEventListener('appDataLoaded', processResults);
    }
    // console.log("当前用户的考试信息", scores)

    const cards = [];

    window.appData.exams.forEach(exam => {
        let actionButton;
        let status;
        const statusScore = scores.find(e => e.examId.toString() == exam.id.toString());
        const score = scores.find(e => e.examId.toString() == exam.id.toString()) || { totalScore: 0 };
        // console.log(exam.isPracticeMode);
        // console.log(score);

        // 练习模式下强制设置为进行中
        // console.log(exam.isPracticeMode, window.isPracticeMode);
        status = exam.isPracticeMode || window.isPracticeMode ? "进行中" : (statusScore ? "已完成" : exam.status);
        if (status === "未开始") {
            actionButton = `<button class="btn btn-outline" disabled>未开始</button>`;
        } else if (status === "进行中") {
            actionButton = `<button class="btn btn-primary start-exam" data-id="${exam.id}">开始考试</button>`;
        } else if (status === "已完成") {
            actionButton = `<button class="btn btn-success" data-id="${exam.id}">查看成绩 (${score.totalScore}分)</button>`;
        }

        const card = `
                                <div class="exam-card">
                                    <div class="exam-header">
                                        <div class="exam-title">${exam.title}</div>
                                <div class="exam-type">${exam.type}</div>
                            </div>
                            <div class="exam-body">
                                <p style="color: #7f8c8d; margin-bottom: 15px;">${exam.description}</p>

                                <div class="exam-info">
                                    <div class="info-item">
                                        <div class="info-label">题目数量</div>
                                        <div class="info-value">${exam.questionsNum}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">考试时长</div>
                                        <div class="info-value">${exam.duration}分钟</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">状态</div>
                                        <div class="info-value" style="color: ${exam.status === "未开始" ? "#e67e22" :
                exam.status === "进行中" ? "#27ae60" : "#3498db"
            };">${exam.status}</div>
                                    </div>
                                </div>

                                <div class="exam-actions">
                                    ${actionButton}
                                    <button class="btn btn-outline">
                                        <i class="fas fa-info-circle"></i> 详情
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;

        cards.push(card);
    });
    container.innerHTML = cards.join('');

    // 使用事件委托优化按钮点击监听
    container.addEventListener('click', function (e) {
        // 处理开始考试按钮
        const startBtn = e.target.closest('.start-exam');
        if (startBtn) {
            const examId = startBtn.dataset.id;
            if (examId) {
                startExam(examId);
            } else {
                console.warn('未找到考试ID');
            }
            return;
        }

        // 处理详情按钮
        const detailBtn = e.target.closest('.btn-outline:has(i.fa-info-circle)');
        // console.log("详情按钮", detailBtn);
        if (detailBtn) {
            // 获取最近的考试卡片元素            
            const examCard = detailBtn.closest('.exam-card');
            if (examCard) {
                // 获取考试ID（从开始考试按钮中获取）
                const successBtn = examCard.querySelector('.btn-success'); //.start-exam
                if (successBtn) {
                    const examId = successBtn.dataset.id;
                    if (examId) {
                        // 获取当前用户ID                        
                        const userId = window.currentUser?.id;
                        if (userId) {
                            // 调用批改模态框函数 - 查看模式
                            openGradingModal(userId, examId, false);
                        } else {
                            console.warn('未找到当前用户ID');
                            showActionMessage('请先登录再查看详情', true);
                        }
                    } else {
                        console.warn('未找到考试ID');
                    }
                }
            }
        }
    });

    // 导入openGradingModal函数
    function openGradingModal(userId, examId, isGradingMode = false) {
        // 检查是否允许考生查看答案
        let isAllowStudentsViewAnswers = window.isAllowStudentsViewAnswers || false;

        // 检查考试特定配置
        const exam = window.appData.exams.find(e => e.id.toString() === examId.toString());
        if (exam && typeof exam.isAllowStudentsViewAnswers !== 'undefined') {
            isAllowStudentsViewAnswers = exam.isAllowStudentsViewAnswers;
        }

        // 权限控制逻辑: 如果不是批改模式且不允许查看答案，则显示提示并返回
        if (!isGradingMode && !isAllowStudentsViewAnswers) {
            showActionMessage('管理员未允许查看答案', true);
            return;
        }

        // 检查是否存在gradingLogic模块
        // console.log(window.gradingModule);
        if (window.gradingModule && typeof window.gradingModule.openGradingModal === 'function') {
            window.gradingModule.openGradingModal(userId, examId, isGradingMode);
        } else {
            console.error('gradingLogic模块未加载或openGradingModal函数不存在');
            showActionMessage('无法打开详情，系统模块加载失败', true);
        }
    }
}

// 开始考试
// 控制导航栏状态
function toggleNavbar(enabled) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (enabled) {
            item.classList.remove('disabled');
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        } else {
            item.classList.add('disabled');
            item.style.pointerEvents = 'none';
            item.style.opacity = '0.5';
        }
    });
}

// 初始化考试相关事件
export function initExamEvents() {
    try {
        // 初始化导航按钮事件
        const prevQuestionBtn = getElement('prevQuestionBtn');
        const nextQuestionBtn = getElement('nextQuestionBtn');
        const submitExamBtn = getElement('submitExamBtn');
        const backToExamsBtn = getElement('backToExamsBtn');

        if (prevQuestionBtn) prevQuestionBtn.addEventListener('click', showPrevQuestion);
        else console.warn('未找到上一题按钮');

        if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', showNextQuestion);
        else console.warn('未找到下一题按钮');

        if (submitExamBtn) submitExamBtn.addEventListener('click', submitExam);
        else console.warn('未找到提交按钮');

        if (backToExamsBtn) backToExamsBtn.addEventListener('click', backToExams);
        else console.warn('未找到返回考试列表按钮');

        // 考试区域切换
        // 首先尝试正确的ID选择器
        let examList = getElement('examCards');

        // 如果没找到，尝试其他常见的选择器
        if (!examList) {
            examList = document.getElementById('examList');
            if (!examList) examList = document.getElementById('examsList');
            if (!examList) examList = document.querySelector('.exams-container');
            if (!examList) examList = document.querySelector('[data-component="exam-list"]');
        }

        if (examList) {
            examList.addEventListener('click', function (e) {
                const examItem = e.target.closest('.exam-item');
                if (examItem) {
                    try {
                        const examId = parseInt(examItem.dataset.id);
                        if (!isNaN(examId)) {
                            startExam(examId);
                        } else {
                            console.error('无效的考试ID:', examItem.dataset.id);
                            showActionMessage('选择的考试无效', true);
                        }
                    } catch (error) {
                        console.error('点击考试项时出错:', error);
                        showActionMessage('选择考试失败', true);
                    }
                }
            });
        } else {
            console.warn('未找到考试列表容器，尝试了多种选择器');
            // 显示详细的错误信息（适用于所有环境）
            console.error('请确保HTML中包含以下任一元素:');
            console.error('- id="examCards" (推荐)');
            console.error('- id="ExamList" 或 id="examList"');
            console.error('- class="examList"');
            console.error('- id="examsList"');
            console.error('- class="exams-container"');
            console.error('- data-component="exam-list"');

            // 可选：如果需要区分开发/生产环境，可以使用自定义全局变量
            // 例如：if (window.DEV_MODE) { ... }
        }
    } catch (error) {
        console.error('初始化考试事件时出错:', error);
        showActionMessage('初始化考试事件失败', true);
    }
}
let timeRemainingEl; // 声明剩余时间显示元素变量

function startExam(examId) {
    try {
        if (!window.appData?.exams) {
            showActionMessage('考试数据未加载', true);
            return;
        }

        const exam = window.appData.exams.find(e => e.id.toString() === examId.toString());
        if (!exam) {
            showActionMessage('考试数据不存在', true);
            return;
        }

        if (!exam.questions || exam.questions.length === 0) {
            showActionMessage('该考试没有可用题目', true);
            return;
        }

        currentExam = exam;
        currentAnswers = {};
        currentQuestionIndex = 0;
        timeRemaining = exam.duration * 60; // 转换为秒
        window.startTime = new Date();

        // 更新考试标题
        const currentExamTitle = getElement('currentExamTitle');
        if (currentExamTitle) {
            currentExamTitle.textContent = exam.title;
        }

        // 隐藏其他部分，显示考试部分
        const sections = getElement('sections');
        if (sections) {
            sections.forEach(s => s.classList.remove('active'));
        }
        const examSection = document.getElementById('examSection');
        if (examSection) {
            examSection.classList.add('active');
        } else {
            console.error('未找到考试区域');
        }

        // 设置考试状态为活动
        isExamActive = true;
        // 禁用导航栏
        toggleNavbar(false);

        // 开始计时器
        startTimer();

        // 渲染问题
        renderQuestions();

        // 渲染分页
        renderPagination();

        // 更新进度
        updateProgress();
    } catch (error) {
        console.error('启动考试时出错:', error);
        showActionMessage('启动考试失败，请重试', true);
    }
}

// 开始计时器
function startTimer() {
    try {
        if (timerInterval) clearInterval(timerInterval);

        updateTimerDisplay();

        timerInterval = setInterval(function () {
            timeRemaining--;
            updateTimerDisplay();

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                submitExam();
                showActionMessage('考试时间已到，系统已自动交卷');
            }
        }, 1000);
    } catch (error) {
        console.error('启动计时器时出错:', error);
        showActionMessage('计时器启动失败', true);
    }
}

// 更新计时器显示
function updateTimerDisplay() {
    try {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const timeRemainingEl = getElement('timeRemainingEl');
        if (timeRemainingEl) {
            timeRemainingEl.textContent = formattedTime;
        }

        const examTimer = getElement('examTimer');
        if (examTimer) {
            // 时间不足5分钟时改变颜色
            if (timeRemaining < 300) {
                examTimer.style.background = 'linear-gradient(to right, #e74c3c, #c0392b)';
            } else {
                examTimer.style.background = ''; // 重置样式
            }
        }
    } catch (error) {
        console.error('更新计时器显示时出错:', error);
    }
}

// 更新进度条
function updateProgress() {
    try {
        if (!currentExam?.questions) {
            console.warn('当前考试没有问题数据');
            return;
        }

        const totalQuestions = currentExam.questions.length;
        let answeredCount = 0;

        currentExam.questions.forEach(question => {
            let isAnswered = false;

            if (question.type === 'case-analysis') {
                // 案例分析题：只要有一个子问题被回答就算已答
                isAnswered = question.questions.some(subQ => {
                    const subId = subQ.id.toString();
                    return currentAnswers[subId] &&
                        (Array.isArray(currentAnswers[subId])
                            ? currentAnswers[subId].some(a => a !== '')
                            : currentAnswers[subId] !== '');
                });
            } else {
                // 其他题型
                isAnswered = currentAnswers[question.id] &&
                    (Array.isArray(currentAnswers[question.id])
                        ? currentAnswers[question.id].length > 0
                        : currentAnswers[question.id] !== '');
            }

            if (isAnswered) {
                answeredCount++;
            }
        });

        const percentage = Math.round((answeredCount / totalQuestions) * 100);

        const progressFill = getElement('progressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        const progressValue = getElement('progressValue');
        if (progressValue) {
            progressValue.textContent = `${percentage}%`;
        }
    } catch (error) {
        console.error('更新进度时出错:', error);
    }
}

// 渲染问题
window.renderQuestions = function () {
    try {
        const questionContainer = getElement('questionContainer');
        if (!questionContainer) {
            console.error('未找到问题容器');
            showActionMessage('加载问题容器失败', true);
            return;
        }

        questionContainer.innerHTML = '';

        // 只显示当前问题
        // console.log("当前问题索引:", currentQuestionIndex);
        if (!currentExam || !currentExam.questions || currentQuestionIndex === undefined || currentQuestionIndex === null) {
            console.error('考试数据或问题索引无效');
            showActionMessage('考试数据无效', true);
            return;
        }

        if (currentQuestionIndex < 0 || currentQuestionIndex >= currentExam.questions.length) {
            console.error('问题索引超出范围:', currentQuestionIndex);
            showActionMessage('问题索引无效', true);
            return;
        }

        const question = currentExam.questions[currentQuestionIndex];
        if (!question) {
            console.error('未找到当前问题:', currentQuestionIndex);
            showActionMessage('未找到当前问题', true);
            return;
        }

        let optionsHtml = '';

        switch (question.type) {
            case 'single':
                question.options.forEach((opt, index) => {
                    const letter = String.fromCharCode(97 + index); // a, b, c, ...
                    const checked = currentAnswers[question.id] && currentAnswers[question.id].includes(letter) ? 'checked' : '';
                    optionsHtml += `
                                        <div class="option-item">
                                            <!-- 修改这里：将 saveMultiAnswer 改为 saveAnswer -->
                                            <input type="radio" name="question_${question.id}" id="option_${question.id}_${letter}"
                                                value="${letter}" ${checked}
                                                onchange="saveAnswer(${question.id}, '${letter}')">
                                            <label for="option_${question.id}_${letter}">${letter}. ${opt}</label>
                                        </div>
                                    `;
                });
                break;

            case 'judge':
                const judgeOptions = ["正确", "错误"];
                judgeOptions.forEach((opt, index) => {
                    const letter = String.fromCharCode(97 + index);
                    const checked = currentAnswers[question.id] === letter ? 'checked' : '';

                    optionsHtml += `
                                        <div class="option-item">
                                            <input type="radio" name="question_${question.id}" id="option_${question.id}_${letter}"
                                                value="${letter}" ${checked}
                                                onchange="saveAnswer(${question.id}, '${letter}')">
                                            <label for="option_${question.id}_${letter}">${letter}. ${opt}</label>
                                        </div>
                                    `;
                });
                break;

            case 'multiple':
                question.options.forEach((opt, index) => {
                    const letter = String.fromCharCode(97 + index);
                    const checked = currentAnswers[question.id] && currentAnswers[question.id].includes(letter) ? 'checked' : '';

                    optionsHtml += `
                        <div class="option-item">
                            <input type="checkbox" name="question_${question.id}" id="option_${question.id}_${letter}"
                                value="${letter}" ${checked}
                                onchange="saveMultiAnswer(${question.id}, '${letter}')">
                            <label for="option_${question.id}_${letter}">${letter}. ${opt}</label>
                        </div>
                    `;
                });
                break;

            case 'fill-blank':
                optionsHtml += `<div class="blanks-container">`;
                question.placeholders.forEach((placeholder, index) => {
                    const answer = currentAnswers[question.id] ? currentAnswers[question.id][index] || '' : '';
                    optionsHtml += `
                                    <div class="blank-item">
                                        <div class="fill-label"> ${index + 1}:</div>
                                        <input type="text" class="fill-blank-input"
                                            value="${answer}" placeholder="${placeholder}"
                                            onchange="saveFillAnswer(${question.id}, ${index}, this.value)">
                                    </div>
                                `;
                });
                optionsHtml += `</div>`;
                break;

            case 'short-answer':
                const shortAnswer = currentAnswers[question.id] || '';
                optionsHtml = `
                                <div class="option-item">
                                    <textarea class="essay-textarea"
                                        onchange="saveAnswer(${question.id}, this.value)"
                                        placeholder="请在此输入您的答案">${shortAnswer}</textarea>
                                </div>
                            `;
                break;

            case 'case-analysis':
                optionsHtml = `
                                <div class="case-analysis">
                                    <div class="case-title">案例描述：</div>
                                    <div class="case-text">${question.caseText}</div>
                                </div>
                            `;

                question.questions.forEach((subQuestion, subIndex) => {
                    let subOptionsHtml = '';

                    switch (subQuestion.type) {
                        case 'single':
                            subQuestion.options.forEach((opt, index) => {
                                const letter = String.fromCharCode(97 + index);
                                const checked = currentAnswers[subQuestion.id] === letter ? 'checked' : '';

                                subOptionsHtml += `
                                                    <div class="option-item">
                                                        <input type="radio" name="question_${subQuestion.id}" id="option_${subQuestion.id}_${letter}"
                                                            value="${letter}" ${checked}
                                                            onchange="saveAnswer('${subQuestion.id}', '${letter}')">
                                                        <label for="option_${subQuestion.id}_${letter}">${letter}. ${opt}</label>
                                                    </div>
                                                `;
                            });
                            break;

                        case 'judge':
                            const judgeOptions = ["正确", "错误"];
                            judgeOptions.forEach((opt, index) => {
                                const letter = String.fromCharCode(97 + index);
                                const checked = currentAnswers[subQuestion.id] === letter ? 'checked' : '';

                                subOptionsHtml += `
                                                    <div class="option-item">
                                                        <input type="radio" name="question_${subQuestion.id}" id="option_${subQuestion.id}_${letter}"
                                                            value="${letter}" ${checked}
                                                            onchange="saveAnswer('${subQuestion.id}', '${letter}')">
                                                        <label for="option_${subQuestion.id}_${letter}">${letter}. ${opt}</label>
                                                    </div>
                                                `;
                            });
                            break;

                        case 'multiple':
                            subQuestion.options.forEach((opt, index) => {
                                const letter = String.fromCharCode(97 + index);
                                const checked = currentAnswers[subQuestion.id] && currentAnswers[subQuestion.id].includes(letter) ? 'checked' : '';
                                subOptionsHtml += `
                                                    <div class="option-item">
                                                        <input type="checkbox" name="question_${subQuestion.id}" id="option_${subQuestion.id}_${letter}"
                                                            value="${letter}" ${checked}
                                                            onchange="saveMultiAnswer('${subQuestion.id}', '${letter}')">
                                                        <label for="option_${subQuestion.id}_${letter}">${letter}. ${opt}</label>
                                                    </div>
                                                `;
                            });
                            break;

                        case 'fill-blank':
                            subOptionsHtml += `<div class="blanks-container">`;
                            subQuestion.placeholders.forEach((placeholder, index) => {
                                const answer = currentAnswers[subQuestion.id] ? currentAnswers[subQuestion.id][index] || '' : '';

                                subOptionsHtml += `
                                                    <div class="blank-item">
                                                        <div class="fill-label">填空 ${index + 1}:</div>
                                                        <input type="text" class="fill-blank-input"
                                                            value="${answer}" placeholder="${placeholder}"
                                                            onchange="saveFillAnswer('${subQuestion.id}', ${index}, this.value)">
                                                    </div>
                                                `;
                            });
                            subOptionsHtml += `</div>`;
                            break;

                        case 'short-answer':
                            const subShortAnswer = currentAnswers[subQuestion.id] || '';
                            subOptionsHtml = `
                                    <div class="option-item">
                                        <textarea class="essay-textarea"
                                            onchange="saveAnswer('${subQuestion.id}', this.value)"
                                            placeholder="请在此输入您的答案">${subShortAnswer}</textarea>
                                    </div>
                                `;
                            break;

                        default:
                            console.error('未知子题型:', subQuestion.type);
                            subOptionsHtml = `<div class="error-message">未知题型: ${subQuestion.type}</div>`;
                            break;
                    }

                    optionsHtml += `
                                    <div class="sub-question">
                                        <div class="question-title">
                                            ${subIndex + 1}. ${subQuestion.text}
                                        </div>
                                        <div class="question-options">
                                            ${subOptionsHtml}
                                        </div>
                                    </div>
                                `;
                });
                break;

            default:
                console.error('未知题型:', question.type);
                optionsHtml = `<div class="error-message">未知题型: ${question.type}</div>`;
                break;
        }

        const questionHtml = `
                        <div class="question-card">
                            <div class="question-title">
                                第${currentQuestionIndex + 1}题 (${getQuestionTypeName(question.type)}, ${question.points}分)
                            </div>
                            <div class="question-text">
                                ${question.text}
                            </div>
                            <div class="question-options">
                                ${optionsHtml}
                            </div>
                        </div>
                    `;

        questionContainer.innerHTML = questionHtml;

        // 渲染数学公式
        if (window.MathJax) {
            try {
                MathJax.typeset();
            } catch (mathError) {
                console.error('渲染数学公式时出错:', mathError);
            }
        }

        // 在渲染后调用MathJax和更新分页状态
        setTimeout(() => {
            // 更新分页活动状态
            updatePaginationActive();
            if (window.MathJax) {
                try {
                    MathJax.typesetPromise();
                } catch (mathError) {
                    console.error('异步渲染数学公式时出错:', mathError);
                }
            }
        }, 0);
    } catch (error) {
        console.error('渲染问题时出错:', error);
        showActionMessage('加载问题失败，请重试', true);
    }
}

// 获取题型名称
function getQuestionTypeName(type) {
    const types = {
        'single': '单选题',
        'multiple': '多选题',
        'judge': '判断题',
        'fill-blank': '填空题',
        'short-answer': '简答题',
        'case-analysis': '案例分析题'
    };
    return types[type] || type;
}

// 保存答案
window.saveAnswer = function (questionId, answer) {
    const idStr = questionId.toString();
    currentAnswers[idStr] = answer;// 单选题直接存储单个值

    updatePaginationStatus(idStr);
    updateProgress();
}

window.saveMultiAnswer = function (questionId, answer) {
    if (!currentAnswers[questionId]) {
        currentAnswers[questionId] = [];
    }

    const index = currentAnswers[questionId].indexOf(answer);
    if (index === -1) {
        currentAnswers[questionId].push(answer);
    } else {
        currentAnswers[questionId].splice(index, 1);
    }

    updatePaginationStatus(questionId);
    updateProgress();
}

window.saveFillAnswer = function (questionId, blankIndex, value) {
    if (!currentAnswers[questionId]) {
        currentAnswers[questionId] = [];
    }
    currentAnswers[questionId][blankIndex] = value;
    updatePaginationStatus(questionId);
    updateProgress();
}

// 更新分页状态
function updatePaginationStatus(questionId) {
    try {
        // 确保questionId是字符串类型
        let idStr = questionId.toString();
        if (String(idStr).includes('-')) {
            idStr = String(idStr).split('-')[0];//案例分析题 取-前的序号
        }

        // 使用属性选择器获取分页按钮
        const btn = document.querySelector(`.page-btn[data-id="${idStr}"]`);
        if (!btn) {
            console.warn('未找到对应问题的分页按钮:', idStr);
            return;
        }

        // 检查考试数据和问题列表
        if (!currentExam || !currentExam.questions || !Array.isArray(currentExam.questions)) {
            console.error('考试数据或问题列表无效');
            return;
        }

        const question = currentExam.questions.find(q => q.id.toString() === idStr);
        if (!question) {
            console.warn('未找到对应问题:', idStr);
            return;
        }

        // 检查题目是否已答
        let isAnswered = false;

        if (question.type === 'case-analysis') {
            // 案例分析题：只要有一个子问题被回答就算已答
            if (!question.questions || !Array.isArray(question.questions)) {
                console.error('案例分析题缺少子问题数据:', idStr);
                return;
            }

            isAnswered = question.questions.some(subQ => {
                const subId = subQ.id.toString();

                return currentAnswers[subId] &&
                    (Array.isArray(currentAnswers[subId])
                        ? currentAnswers[subId].some(a => a !== '')
                        : currentAnswers[subId] !== '');
            });
        } else {
            // 其他题型
            isAnswered = currentAnswers[idStr] &&
                (Array.isArray(currentAnswers[idStr])
                    ? currentAnswers[idStr].some(a => a !== '')
                    : currentAnswers[idStr] !== '');
        }

        // 更新答题状态
        if (isAnswered) {
            btn.classList.add('answered');
        } else {
            btn.classList.remove('answered');
        }
    } catch (error) {
        console.error('更新分页状态时出错:', error);
    }
}

// 渲染分页
function renderPagination() {
    try {
        const pagination = getElement('pagination');
        if (!pagination) {
            console.error('未找到分页容器');
            showActionMessage('加载分页容器失败', true);
            return;
        }

        if (!currentExam || !currentExam.questions) {
            console.error('考试数据或问题列表无效');
            showActionMessage('考试数据无效', true);
            return;
        }

        pagination.innerHTML = '';

        currentExam.questions.forEach((q, index) => {
            let isAnswered = false;

            if (q.type === 'case-analysis') {
                // 案例分析题：只要有一个子问题被回答就算已答
                isAnswered = q.questions.some(subQ => {
                    const subId = subQ.id.toString();
                    return currentAnswers[subId] &&
                        (Array.isArray(currentAnswers[subId])
                            ? currentAnswers[subId].some(a => a !== '')
                            : currentAnswers[subId] !== '');
                });
            } else {
                // 其他题型
                isAnswered = currentAnswers[q.id] &&
                    (Array.isArray(currentAnswers[q.id])
                        ? currentAnswers[q.id].some(a => a !== '')
                        : currentAnswers[q.id] !== '');
            }

            pagination.innerHTML += `
                                    <div class="page-btn ${index === currentQuestionIndex ? 'active' : ''} ${isAnswered ? 'answered' : ''}"
                                            data-id="${q.id}" data-index="${index}" onclick="goToQuestion(${index})">
                                        ${index + 1}
                                    </div>
                                `;
        });
    } catch (error) {
        console.error('渲染分页时出错:', error);
        showActionMessage('加载分页失败，请重试', true);
    }
}

// 更新分页活动状态
function updatePaginationActive() {
    try {
        const pageButtons = document.querySelectorAll('.page-btn');
        if (!pageButtons || pageButtons.length === 0) {
            console.warn('未找到分页按钮');
            return;
        }

        if (currentQuestionIndex === undefined || currentQuestionIndex === null) {
            console.warn('当前问题索引未定义');
            return;
        }

        pageButtons.forEach(btn => {
            try {
                btn.classList.remove('active');
                const index = parseInt(btn.getAttribute('data-index'));
                if (!isNaN(index) && index === currentQuestionIndex) {
                    btn.classList.add('active');
                }
            } catch (btnError) {
                console.error('处理分页按钮时出错:', btnError);
            }
        });
    } catch (error) {
        console.error('更新分页活动状态时出错:', error);
    }
}

// 跳转到指定问题
window.goToQuestion = function (index) {
    try {
        // 验证索引是否有效
        if (index === undefined || index === null || isNaN(index)) {
            console.error('无效的问题索引:', index);
            showActionMessage('无效的问题索引', true);
            return;
        }

        // 检查考试数据和问题列表
        if (!currentExam || !currentExam.questions || !Array.isArray(currentExam.questions)) {
            console.error('考试数据或问题列表无效');
            showActionMessage('考试数据无效', true);
            return;
        }

        // 检查索引范围
        if (index < 0 || index >= currentExam.questions.length) {
            console.error('问题索引超出范围:', index);
            showActionMessage('问题索引超出范围', true);
            return;
        }

        currentQuestionIndex = index;
        renderQuestions();
    } catch (error) {
        console.error('跳转到指定问题时出错:', error);
        showActionMessage('跳转问题失败，请重试', true);
    }
}

// 计算填空题答对的数量
window.countCorrectBlanks = function (question) {
    if (!currentAnswers[question.id]) return 0;

    let correctCount = 0;
    for (let i = 0; i < question.placeholders.length; i++) {
        // 将用户答案和正确答案都转为小写并去除空格后比较
        const userAnswer = (currentAnswers[question.id][i] || '').trim().toLowerCase();
        const correctAnswer = (question.correctAnswer[i] || '').trim().toLowerCase();

        if (userAnswer === correctAnswer) {
            correctCount++;
        }
    }
    return correctCount;
}

// 检查答案是否正确
window.checkAnswerCorrect = function (question) {
    if (!currentAnswers[question.id]) return false;

    switch (question.type) {
        case 'single':
            // 将用户答案和正确答案都转为小写比较
            const userSingleAnswer = currentAnswers[question.id].toLowerCase();
            const correctSingleAnswer = question.correctAnswer[0].toLowerCase();
            return userSingleAnswer === correctSingleAnswer;

        case 'judge':
            // 将用户答案和正确答案都转为小写比较
            const userJudgeAnswer = currentAnswers[question.id].toLowerCase();

            const correctJudgeAnswer = question.correctAnswer[0].toLowerCase();
            return userJudgeAnswer === correctJudgeAnswer;

        case 'multiple':
            /*const correctAnswers = [...question.correctAnswer].sort().join('');
            const userAnswers = [...currentAnswers[question.id]].sort().join('');
            return correctAnswers === userAnswers;*/
            // 将用户答案和正确答案都转为小写比较
            const userMultiAnswers = currentAnswers[question.id].map(a => a.toLowerCase()).sort();

            const correctMultiAnswers = question.correctAnswer.map(a => a.toLowerCase()).sort();
            return userMultiAnswers.join('') === correctMultiAnswers.join('');

        case 'fill-blank':
            return countCorrectBlanks(question) === question.placeholders.length;

        case 'short-answer':
        case 'case-analysis':
            // 简答题和分析题需要人工批改，这里不做自动评分
            return false;
    }

    return false;
}

// 考试导航函数 - 上一题
function showPrevQuestion() {
    try {
        // 检查考试数据和问题列表
        if (!currentExam || !currentExam.questions || !Array.isArray(currentExam.questions)) {
            console.error('考试数据或问题列表无效');
            showActionMessage('考试数据无效', true);
            return;
        }

        // 检查当前索引
        if (currentQuestionIndex === undefined || currentQuestionIndex === null) {
            console.error('当前问题索引未定义');
            showActionMessage('当前问题索引无效', true);
            return;
        }
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            window.renderQuestions();
        } else {
            // console.warn('已经是第一题，无法继续向前');
            showActionMessage('已经是第一题', false);
        }
    } catch (error) {
        console.error('切换到上一题时出错:', error);
        showActionMessage('切换问题失败，请重试', true);
    }
}

// 考试导航函数 - 下一题
function showNextQuestion() {
    try {
        // 检查考试数据和问题列表
        if (!currentExam || !currentExam.questions || !Array.isArray(currentExam.questions)) {
            console.error('考试数据或问题列表无效');
            showActionMessage('考试数据无效', true);
            return;
        }

        // 检查当前索引
        if (currentQuestionIndex === undefined || currentQuestionIndex === null) {
            console.error('当前问题索引未定义');
            showActionMessage('当前问题索引无效', true);
            return;
        }

        if (currentQuestionIndex < currentExam.questions.length - 1) {
            currentQuestionIndex++;
            window.renderQuestions();
        } else {
            // console.warn('已经是最后一题，无法继续向后');
            showActionMessage('已经是最后一题', false);
        }
    } catch (error) {
        console.error('切换到下一题时出错:', error);
        showActionMessage('切换问题失败，请重试', true);
    }
}

// 提交试卷
function submitExam() {
    try {
        // 清除计时器
        if (timerInterval) clearInterval(timerInterval);

        // 检查必要数据是否存在
        if (!window.currentUser || !currentExam || !Array.isArray(currentExam.questions)) {
            console.error('提交考试失败: 用户信息或考试数据无效');
            showActionMessage('提交考试失败: 数据无效', true);
            return;
        }

        if (!window.appData || !Array.isArray(window.appData.exams) || !Array.isArray(window.appData.answers) || !Array.isArray(window.appData.results)) {
            console.error('提交考试失败: 应用数据结构无效');
            showActionMessage('提交考试失败: 系统数据错误', true);
            return;
        }

        const endTime = new Date();
        // 检查开始时间是否存在
        if (!window.startTime) {
            console.error('提交考试失败: 开始时间未定义');
            showActionMessage('提交考试失败: 无法计算考试时长', true);
            return;
        }
        const timeTaken = Math.round((endTime - window.startTime) / 1000); // 秒

        // 计算得分
        let totalScore = 0;
        let correctCount = 0; // 完全答对的题目数
        let answeredCount = 0; // 已答题数

        currentExam.questions.forEach(question => {
            if (question.type === 'case-analysis') {
                // 案例分析题：处理子问题
                if (!Array.isArray(question.questions)) {
                    console.error(`案例分析题ID: ${question.id} 缺少子问题数据`);
                    return;
                }

                question.questions.forEach(subQuestion => {
                    // 检查是否答题（任何形式的回答）
                    const hasAnswer = subQuestion.type === 'fill-blank'
                        ? (currentAnswers[subQuestion.id] && Array.isArray(currentAnswers[subQuestion.id]) && currentAnswers[subQuestion.id].some(a => a?.trim() !== ''))
                        : currentAnswers[subQuestion.id] !== undefined;

                    if (hasAnswer) {
                        answeredCount++;
                    }

                    // 计算得分
                    if (subQuestion.type === 'fill-blank') {
                        if (!Array.isArray(subQuestion.placeholders)) {
                            console.error(`子问题ID: ${subQuestion.id} 缺少占位符数据`);
                            return;
                        }
                        const pointsPerBlank = subQuestion.points / subQuestion.placeholders.length;
                        const correctBlanks = countCorrectBlanks(subQuestion);
                        totalScore += correctBlanks * pointsPerBlank;

                        // 如果所有空都正确，则计入完全答对题目数
                        if (correctBlanks === subQuestion.placeholders.length) {
                            correctCount++;
                        }
                    } else {
                        if (checkAnswerCorrect(subQuestion)) {
                            totalScore += subQuestion.points;
                            correctCount++;
                        }
                    }
                });
            } else {
                // 非案例分析题
                // 检查是否答题（任何形式的回答）
                const hasAnswer = question.type === 'fill-blank'
                    ? (currentAnswers[question.id] && Array.isArray(currentAnswers[question.id]) && currentAnswers[question.id].some(a => a?.trim() !== ''))
                    : currentAnswers[question.id] !== undefined;

                if (hasAnswer) {
                    answeredCount++;
                }

                // 计算得分
                if (question.type === 'fill-blank') {
                    if (!Array.isArray(question.placeholders)) {
                        console.error(`题目ID: ${question.id} 缺少占位符数据`);
                        return;
                    }
                    const pointsPerBlank = question.points / question.placeholders.length;
                    const correctBlanks = countCorrectBlanks(question);
                    totalScore += correctBlanks * pointsPerBlank;

                    // 如果所有空都正确，则计入完全答对题目数
                    if (correctBlanks === question.placeholders.length) {
                        correctCount++;
                    }
                } else {
                    if (checkAnswerCorrect(question)) {
                        totalScore += question.points;
                        correctCount++;
                    }
                }
            }
        });

        // 更新考试状态
        const examIndex = window.appData.exams.findIndex(e => e.id === currentExam.id);
        if (examIndex === -1) {
            console.error(`未找到考试ID: ${currentExam.id} 的数据`);
            showActionMessage('提交考试失败: 考试数据不存在', true);
            return;
        }

        // 重置考试状态
        isExamActive = false;
        // 启用导航栏
        toggleNavbar(true);

        // 练习模式下不保存answers.json和results.json数据
        // console.log(currentExam.isPracticeMode);
        if (!(currentExam.isPracticeMode || window.isPracticeMode)) {
            // 将考生答案转换成数组格式
            let answer = [];
            try {
                window.appData.exams[examIndex].questions.forEach(e => {
                    if (e.type === 'case-analysis') {
                        // 处理案例分析题的子问题答案
                        if (!Array.isArray(e.questions)) {
                            console.error(`案例分析题ID: ${e.id} 缺少子问题数据`);
                            return;
                        }
                        const subAnswers = [];
                        e.questions.forEach(subQ => {
                            subAnswers.push(currentAnswers[subQ.id] ?? '');
                        });
                        e.userAnswer = subAnswers;
                    } else {
                        e.userAnswer = currentAnswers[e.id] ?? '';
                    }
                    // 只保存必要的答案信息
                    answer.push({
                        id: e.id,
                        type: e.type,
                        userAnswer: e.userAnswer
                    });
                });
            } catch (error) {
                console.error('处理答案数据时出错:', error);
                showActionMessage('提交考试失败: 答案数据处理错误', true);
                return;
            }

            // 准备新的提交数据
            let newSubmission;
            try {
                newSubmission = {
                    "userId": window.currentUser.id,
                    "userName": window.currentUser.name,
                    "startTime": formatDateTimeLocal(window.startTime),
                    "endTime": formatDateTimeLocal(endTime),
                    "examTime": `${Math.floor(timeTaken / 60).toString().padStart(2, '0')}:${(timeTaken % 60).toString().padStart(2, '0')}`,
                    "objectiveScore": Number(totalScore.toFixed(1)),//Math.round(totalScore)
                    "subjectiveScore": null,
                    "totalScore": Number(totalScore.toFixed(1)),
                    "answers": answer
                };
            } catch (error) {
                console.error('准备提交数据时出错:', error);
                showActionMessage('提交考试失败: 数据格式化错误', true);
                return;
            }

            // 更新答案数据
            const answerIndex = window.appData.answers.findIndex(e => e.examId.toString() === currentExam.id.toString());
            if (answerIndex !== -1) {
                if (!Array.isArray(window.appData.answers[answerIndex].submissions)) {
                    window.appData.answers[answerIndex].submissions = [];
                }
                window.appData.answers[answerIndex] = {
                    ...window.appData.answers[answerIndex],
                    submissions: [
                        ...window.appData.answers[answerIndex].submissions,
                        newSubmission
                    ]
                };
            } else {
                window.appData.answers.push({
                    "examId": currentExam.id,
                    "examName": currentExam.title,
                    "duration": window.appData.exams[examIndex].duration,
                    "submissions": [newSubmission]
                });
            }
            // 添加到结果数据
            try {
                window.appData.results.push(
                    {
                        "rank": null,
                        "userId": window.currentUser.id,
                        "userName": window.currentUser.name,
                        "examId": currentExam.id,
                        "examName": currentExam.title,
                        "objectiveScore": Number(totalScore.toFixed(1)),
                        "subjectiveScore": null,
                        "totalScore": Number(totalScore.toFixed(1)),
                        "startTime": formatDateTimeLocal(window.startTime),
                        "endTime": formatDateTimeLocal(endTime),
                        "examTime": `${Math.floor(timeTaken / 60).toString().padStart(2, '0')}:${(timeTaken % 60).toString().padStart(2, '0')}`,
                        "gradingStatus": "待批改",
                        "examStatus": (totalScore >= 60) ? "通过" : "未通过"
                    }
                );
            } catch (error) {
                console.error('添加结果数据时出错:', error);
                showActionMessage('提交考试失败: 结果数据保存错误', true);
                return;
            }
            // 保存数据到服务器
            try {
                saveToFile('/api/save-answers', window.appData.answers);
                saveToFile('/api/save-results', window.appData.results);
            } catch (error) {
                console.error('保存数据时出错:', error);
                showActionMessage('提交考试失败: 数据保存错误', true);
                return;
            }
        }
        renderExamCards();
        renderGradingTable(); // 将考完考生加入到批改中
        // 显示考试结果
        const finalScore = getElement('finalScore');
        const totalQuestions = getElement('totalQuestions');
        const answeredQuestions = getElement('answeredQuestions');
        const correctAnswers = getElement('correctAnswers');
        const examTime = getElement('examTime');
        const resultSection = getElement('resultSection');

        if (!finalScore || !totalQuestions || !answeredQuestions || !correctAnswers || !examTime || !resultSection) {
            console.error('提交考试失败: 缺少必要的DOM元素');
            showActionMessage('提交考试失败: 无法显示结果', true);
            return;
        }

        finalScore.textContent = Number(totalScore.toFixed(1));
        totalQuestions.textContent = currentExam.questions.length;
        answeredQuestions.textContent = answeredCount;
        correctAnswers.textContent = correctCount;

        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        examTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // 渲染结果图表
        try {
            renderResultChart(correctCount, currentExam.questions.length - correctCount);
        } catch (error) {
            console.error('渲染结果图表时出错:', error);
            showActionMessage('提交考试成功，但图表渲染失败', false);
        }

        // 隐藏考试部分，显示结果部分
        try {
            // 获取所有部分并移除active类
            const sections = document.querySelectorAll('.section');
            // console.log(sections);
            sections.forEach(s => s.classList.remove('active'));
            resultSection.classList.add('active');
        } catch (error) {
            console.error('切换到结果页面时出错:', error);
            showActionMessage('提交考试成功，但无法显示结果页面', false);
        }

        showActionMessage('考试提交成功', false);
    } catch (error) {
        console.error('提交考试时发生未预期错误:', error);
        showActionMessage('提交考试失败，请联系管理员', true);
    }
}

// 返回我的考试
function backToExams() {
    try {
        // 重置考试状态
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        currentAnswers = {};
        currentQuestionIndex = 0;

        // 返回考试列表
        try {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        } catch (error) {
            console.error('移除section active类时出错:', error);
        }

        const examsSection = getElement('examsSection');
        if (!examsSection) {
            console.error('返回考试列表失败: 未找到examsSection元素');
            showActionMessage('返回考试列表失败: 页面元素缺失', true);
            return;
        }

        examsSection.classList.add('active');

        // 渲染考试卡片
        try {
            renderExamCards();
        } catch (error) {
            console.error('渲染考试卡片时出错:', error);
            showActionMessage('返回考试列表成功，但无法加载考试数据', false);
        }

        showActionMessage('已返回考试列表', false);
    } catch (error) {
        console.error('返回考试列表时发生未预期错误:', error);
        showActionMessage('返回考试列表失败，请重试', true);
    }
}

// 渲染结果图表
export function renderResultChart(correctCount, incorrectCount) {
    try {
        // 检查参数有效性
        if (typeof correctCount !== 'number' || typeof incorrectCount !== 'number' || isNaN(correctCount) || isNaN(incorrectCount)) {
            console.error('渲染图表失败: 参数无效', { correctCount, incorrectCount });
            showActionMessage('渲染图表失败: 数据无效', true);
            return;
        }

        // 获取图表元素
        const resultChart = getElement('resultChart');
        if (!resultChart) {
            console.error('渲染图表失败: 未找到resultChart元素');
            showActionMessage('渲染图表失败: 页面元素缺失', true);
            return;
        }

        // 检查Chart库是否已加载
        if (typeof Chart === 'undefined') {
            console.error('渲染图表失败: Chart.js未加载');
            showActionMessage('渲染图表失败: 图表库未加载', true);
            return;
        }

        // 获取canvas上下文
        const ctx = resultChart.getContext('2d');
        if (!ctx) {
            console.error('渲染图表失败: 无法获取canvas上下文');
            showActionMessage('渲染图表失败: 画布初始化错误', true);
            return;
        }

        // 销毁已存在的图表实例
        if (window.resultChartInstance) {
            try {
                window.resultChartInstance.destroy();
            } catch (error) {
                console.error('销毁现有图表实例时出错:', error);
            }
            window.resultChartInstance = null;
        }

        // 创建新图表实例
        try {
            window.resultChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['答对题目', '答错题目'],
                    datasets: [{
                        data: [correctCount, incorrectCount],
                        backgroundColor: [
                            '#2ecc71',
                            '#e74c3c'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: '答题情况分析',
                            font: {
                                size: 18
                            }
                        }
                    }
                }
            });
            // console.log('图表渲染成功');
        } catch (error) {
            console.error('创建图表实例时出错:', error);
            showActionMessage('渲染图表失败: 图表创建错误', true);
            return;
        }
    } catch (error) {
        console.error('渲染结果图表时发生未预期错误:', error);
        showActionMessage('渲染图表失败，请重试', true);
    }
}