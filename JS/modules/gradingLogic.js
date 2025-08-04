import { formatDateTime } from '../utils/format.js';
import { showActionMessage } from '../utils/format.js';
import { saveToFile } from './examManagement.js'
// import { renderResultsTable } from './results.js'

// 确保gradingModule对象存在
window.gradingModule = window.gradingModule || {};

let currentGradingPaper = null;// 当前批改的试卷

// 定义模块级函数
function openGradingModal(userId, examId, isGradingMode = true) {
    // console.log(userId)
    // console.log(examId)
    const appData = window.appData || {};
    const answerData = appData.answers.find(s => s.examId.toString() === examId.toString());
    const submission = answerData.submissions.find(s => s.userId === userId);
    const examData = appData.exams.find(s => s.id.toString() === examId.toString());
    const questions = examData.questions;

    // 创建submission的深拷贝，避免修改原始数据
    const submissionCopy = JSON.parse(JSON.stringify(submission));

    // 使用深拷贝的数据进行合并
    const answers = mergeJsonData(questions, submissionCopy.answers);
    submissionCopy.answers = answers;
    // console.log(submissionCopy);

    // 处理teacherScore    
    if (submissionCopy.teacher && Array.isArray(submissionCopy.teacher.score)) {
        // 创建答案ID到答案对象的映射，提高查找效率
        const answerMap = new Map();
        submissionCopy.answers.forEach((answer) => {
            answerMap.set(answer.id.toString(), answer);

            // 如果是案例分析题，为子问题创建映射
            if (answer.questions) {
                answer.questions.forEach((subQuestion) => {
                    answerMap.set(subQuestion.id.toString(), {
                        parent: answer,
                        subQuestion: subQuestion
                    });
                });
            }
        });

        // 应用教师评分
        submissionCopy.teacher.score.forEach((score) => {
            const scoreId = String(score.id);
            const target = answerMap.get(scoreId);

            if (target) {
                if (target.subQuestion) {
                    // 子问题评分
                    target.subQuestion.teacherScore = score.score;
                } else {
                    // 普通问题评分
                    target.teacherScore = score.score;
                }
            }
        });
    }

    if (!submissionCopy) return;
    submissionCopy.examId = examId;
    submissionCopy.examName = examData.title;
    currentGradingPaper = submissionCopy;
    // console.log(submissionCopy);

    // 设置考生信息
    document.getElementById('studentName').textContent = currentGradingPaper.userName;
    document.getElementById('userId').textContent = currentGradingPaper.userId;
    document.getElementById('examNameG').textContent = currentGradingPaper.examName;
    document.getElementById('objectiveScore').textContent = currentGradingPaper.objectiveScore;

    // 设置当前批改模式
    window.gradingModule.currentGradingMode = isGradingMode;

    // 渲染题目
    renderQuestionsGrade(currentGradingPaper.answers);

    // 计算并显示总分预览
    updateTotalScorePreview();

    // 显示模态框
    document.getElementById('gradingModal').style.display = 'flex';

    // 根据模式设置提交按钮状态
    document.getElementById('submitGradingBtn').disabled = !isGradingMode;

    // 添加关闭按钮事件绑定
    document.querySelector('#gradingModal .close-modal').addEventListener('click', closeGradingModal);
}


// 渲染批改表格
function renderGradingTable() {
    const container = document.getElementById('gradingTable');
    container.innerHTML = '';

    const rows = [];
    const gradingData = window.appData?.results || [];
    // console.log('批改数据:', gradingData);
    if (!Array.isArray(gradingData) || gradingData.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center;">暂无批改数据</td></tr>';
        return;
    }
    gradingData.forEach(item => {
        let statusColor = item.status === "待批改" ? "#e67e22" : "#3498db";

        const row = `
                                <tr>
                                    <td>${item.userName}</td>
                                    <td>${item.examName}</td>
                                    <td>${formatDateTime(item.endTime)}</td>
                                    <td>${item.objectiveScore}</td>
                                    <td style="color: ${statusColor};">${item.gradingStatus}</td>
                                    <td>
                                        <button class="btn btn-outline grade-btn" user-id="${item.userId}" exam-id="${item.examId}" style="padding: 5px 10px; font-size: 14px;">
                                            <i class="fas fa-edit"></i> 批改
                                        </button>
                                    </td>
                                </tr>
                            `;

        rows.push(row);
    });
    container.innerHTML = rows.join('');
    // 添加批改按钮事件监听
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const userId = this.getAttribute('user-id');
            const examId = this.getAttribute('exam-id');
            //console.log(examId)
            window.gradingModule.openGradingModal(userId, examId, true);
        });
    });

    // 添加关闭按钮事件绑定
    document.querySelector('#gradingModal .close-modal').addEventListener('click', closeGradingModal);
}

// 渲染题目/批改试卷题目
function renderQuestionsGrade(questions) {
    // 根据当前模式设置是否只显示简答题
    // 在查看模式下(false)显示所有题型，在批改模式下(true)尊重localStorage配置
    const isGradingMode = window.gradingModule?.currentGradingMode ?? true;
    const onlyShortAnswer = isGradingMode ? (localStorage.getItem('onlyShortAnswer') !== 'false') : false;// 仅显示简答题
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    //questionsContainer.innerHTML = '';

    //console.log(questions)
    if (!Array.isArray(questions)) return;
    questions.forEach((question, index) => {
        if (question.type === 'case-analysis' || question.type === 'short-answer' || !onlyShortAnswer) {
            // console.log("问题类型:", question.type);
            const questionEl = document.createElement('div');
            questionEl.className = 'question-card';

            let questionContent = `
                            <div class="question-header">
                                <div class="question-title">${index + 1}. ${question.text}</div>
                                <div class="question-points">${question.points}分</div>
                            </div>
                        `;
            /*let questionContent = '';
            let answerSection = '';
 
            // 公共标题部分
            let titleHtml = `
                <div class="question-header">
                    <div class="question-title">${index + 1}. ${question.text}</div>
                    <div class="question-points">${question.points}分</div>
                </div>
            `;*/

            // 案例分析题特殊处理
            if (question.type === 'case-analysis') {
                // questionContent = `<div class="question-content">${question.caseText}</div>`;                
                questionContent = `
                            <!-div class="question-header"-->
                                <div class="question-title">${index + 1}. ${question.text}</div>
                                <div class="question-content">${question.caseText}</div>
                            <!-/div-->
                        `;
                // 处理子问题
                let subQuestionsHtml = '';
                question.questions.forEach((subQ, subIndex) => {
                    if (!onlyShortAnswer) {
                        subQuestionsHtml += renderSubQuestion(subQ, `${index + 1}.${subIndex + 1}`);
                    } else {
                        if (subQ.type === 'short-answer') {
                            // console.log("子问题类型:", subQ.type);
                            subQuestionsHtml += renderSubQuestion(subQ, `${index + 1}.${subIndex + 1}`);
                        }
                    };
                });

                questionContent += subQuestionsHtml;
                /*answerSection = `
                    <div class="answer-section">
                        ${subQuestionsHtml}
                    </div>
                `;*/
            }
            // 其他题型
            else {
                // 处理选项型题目
                if (question.options) {
                    let optionsHtml = '<div class="options-list">';
                    question.options.forEach((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        optionsHtml += `<div class="option-item">${letter}. ${opt}</div>`;
                    });
                    optionsHtml += '</div>';
                    questionContent += optionsHtml;
                    //questionContent = `<div class="question-content">${optionsHtml}</div>`;
                }
                questionContent += renderAnswerSection(question, window.gradingModule.currentGradingMode);
                //answerSection = renderAnswerSection(question, index + 1);                                   
            }
            questionEl.innerHTML = questionContent;
            //questionEl.innerHTML = titleHtml + questionContent + answerSection;
            questionsContainer.appendChild(questionEl);
        }
    });
    // 添加MathJax渲染
    setTimeout(() => {
        MathJax.typesetPromise();
    }, 0);
}

// 渲染子问题
function renderSubQuestion(question, number) {
    return `
                        <div class="sub-question">
                            <div class="question-header">
                                <div class="question-title">${number} ${question.text}</div>
                                <div class="question-points">${question.points}分</div>
                            </div>
                            ${question.options ? renderOptions(question.options) : ''}
                            ${renderAnswerSection(question, window.gradingModule.currentGradingMode)}
                        </div>
                    `;
}

// 渲染选项
function renderOptions(options) {
    let html = '<div class="options-list">';
    options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        html += `<div class="option-item">${letter}. ${opt}</div>`;
    });
    html += '</div>';
    return html;
}

// 渲染答案区域
function renderAnswerSection(question, isGradingMode = true) {
    const isObjective = ['single', 'multiple', 'judge', 'fill-blank'].includes(question.type);

    return `
                        <div class="answer-section">
                            <div class="answer-group">
                                <div class="answer-title"><i class="fas fa-user"></i> 考生答案</div>
                                <div class="answer-content">${formatUserAnswer(question)}</div>
                            </div>

                            <div class="answer-group">
                                <div class="answer-title"><i class="fas fa-check-circle"></i> 参考答案</div>
                                <div class="answer-content">${isObjective ? formatCorrectAnswer(question) : question.correctAnswer}</div>
                            </div>

                            ${!isObjective ? `
                            <div class="answer-group">
                                <div class="answer-title"><i class="fas fa-edit"></i> 评分</div>
                                <div class="answer-content">
                                    <div class="subjective-scoring">
                                        <input type="number" class="score-input" id="score-${question.id}"
                                               min="0" max="${question.points}"
                                               value="${question.teacherScore ?? ''}"
                                               placeholder="输入分数"
                                               onchange="updateTotalScorePreview()">
                                        <span class="max-points">/ ${question.points}分</span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    `;
    // {question.teacherScore || ''} 0分 {question.teacherScore ?? ''}
}

// 格式化考生答案
function formatUserAnswer(question) {
    if (!question.userAnswer ||
        (Array.isArray(question.userAnswer) && question.userAnswer.length === 0)) {
        return '<span style="color: #e74c3c;">未作答</span>';
    }

    switch (question.type) {
        case 'single':
        case 'judge':
            return question.userAnswer;
        case 'multiple':
            return question.userAnswer.join(', ');
        case 'fill-blank':
            return question.userAnswer.map((ans, idx) =>
                `${idx + 1}. ${ans || '<span style="color: #e74c3c;">未填写</span>'}`).join('<br>');
        default:
            return question.userAnswer;
    }
}

// 格式化参考答案
function formatCorrectAnswer(question) {
    switch (question.type) {
        case 'single':
        case 'judge':
            return question.correctAnswer[0];
        case 'multiple':
            return question.correctAnswer.join(', ');
        case 'fill-blank':
            return question.correctAnswer.map((ans, idx) =>
                `${idx + 1}. ${ans}`).join('<br>');
        default:
            return question.correctAnswer;
    }
}

// 渲染考生答案
function renderUserAnswer(question) {
    if (!question.userAnswer) return '未作答';

    switch (question.type) {
        case 'single':
        case 'judge':
            return question.userAnswer;

        case 'multiple':
            return question.userAnswer.join(', ');

        case 'fill-blank':
            return question.userAnswer.map((ans, idx) =>
                `${idx + 1}. ${ans || '未填写'}`).join('<br>');

        case 'short-answer':
            return question.userAnswer || '未作答';

        default:
            return question.userAnswer;
    }
}

// 渲染参考答案
function renderCorrectAnswer(question) {
    switch (question.type) {
        case 'single':
        case 'judge':
            return question.correctAnswer[0];

        case 'multiple':
            return question.correctAnswer.join(', ');

        case 'fill-blank':
            return question.correctAnswer.map((ans, idx) =>
                `${idx + 1}. ${ans}`).join('<br>');

        default:
            return question.correctAnswer;
    }
}

// 更新总分预览
window.updateTotalScorePreview = function () {
    if (!currentGradingPaper) return;

    let subjectiveScore = 0;

    // 计算主观题得分
    // console.log(currentGradingPaper.answers);
    currentGradingPaper.answers.forEach(question => {
        if (question.type === 'short-answer') {
            const scoreInput = document.getElementById(`score-${question.id}`);
            if (scoreInput && scoreInput.value) {
                subjectiveScore += parseFloat(scoreInput.value);
            }
        }
        else if (question.type === 'case-analysis') {
            question.questions.forEach(subQ => {
                if (subQ.type === 'short-answer') {
                    const scoreInput = document.getElementById(`score-${subQ.id}`);
                    if (scoreInput && scoreInput.value) {
                        subjectiveScore += parseFloat(scoreInput.value);
                    }
                }
            });
        }
    });

    const totalScore = currentGradingPaper.objectiveScore + subjectiveScore;
    //totalScorePreview.textContent = totalScore;
    document.getElementById('subjectiveScorePreview').textContent = subjectiveScore;
    document.getElementById('totalScorePreview').textContent = totalScore;
}

// 提交批改结果
function submitGrading() {
    let allScored = true;
    let teacherScore = [];

    // 收集主观题评分
    currentGradingPaper.answers.forEach(question => {
        //console.log(question)
        if (question.type === 'short-answer') {
            const scoreInput = document.getElementById(`score-${question.id}`);
            if (scoreInput && scoreInput.value) {
                question.teacherScore = parseFloat(scoreInput.value);
                teacherScore.push({
                    "id": question.id,
                    "type": question.type,
                    "score": question.teacherScore
                });
            } else {
                allScored = false;
            }
        }
        else if (question.type === 'case-analysis') {
            question.questions.forEach(subQ => {
                //console.log(subQ)
                if (subQ.type === 'short-answer') {
                    const scoreInput = document.getElementById(`score-${subQ.id}`);
                    if (scoreInput && scoreInput.value) {
                        subQ.teacherScore = parseFloat(scoreInput.value);
                        teacherScore.push({
                            "id": subQ.id,
                            "type": subQ.type,
                            "score": subQ.teacherScore
                        });
                    } else {
                        allScored = false;
                    }
                }
            });
        }
        // console.log(question);
    });

    if (!allScored) {
        showActionMessage('请完成所有主观题评分', true);
        return;
    }

    // 计算总分
    updateTotalScorePreview();

    const subjectiveScore = parseFloat(document.getElementById('subjectiveScorePreview').textContent);
    const totalScore = parseFloat(document.getElementById('totalScorePreview').textContent);

    // 更新状态
    // const gradingItem = window.appData.grading.find(g => g.userId === currentGradingPaper.userId);
    // if (gradingItem) {
    //     gradingItem.status = '已批改';
    //     // gradingItem.totalScore = totalScore;
    // }
    // const gradingIndex = window.appData.grading.findIndex(g => g.userId === currentGradingPaper.userId);
    // if (gradingIndex !== -1) {
    //     // window.appData.grading[gradingIndex].subjectiveScore = subjectiveScore;//主观题得分
    //     // window.appData.grading[gradingIndex].totalScore = totalScore;
    //     window.appData.grading[gradingIndex].status = "已批改";
    // }
    // console.log(gradingIndex);    
    // console.log(window.appData.grading);
    // console.log(currentGradingPaper);
    // console.log(window.appData.results);
    const resultsIndex = window.appData.results.findIndex(g => g.userId === currentGradingPaper.userId && g.examId.toString() === currentGradingPaper.examId.toString());
    // console.log(resultsIndex)
    if (resultsIndex !== -1) {
        //answers.results[resultsIndex].rank = 1;
        window.appData.results[resultsIndex].subjectiveScore = subjectiveScore;
        window.appData.results[resultsIndex].totalScore = totalScore;
        window.appData.results[resultsIndex].gradingStatus = "已批改";
        window.appData.results[resultsIndex].examStatus = (totalScore >= 60) ? "通过" : "未通过";
    }

    const answerIndex = window.appData.answers.findIndex(s => s.examId.toString() === currentGradingPaper.examId.toString());
    const submissionIndex = window.appData.answers[answerIndex].submissions.findIndex(s => s.userId === currentGradingPaper.userId);

    if (submissionIndex !== -1) {
        window.appData.answers[answerIndex].submissions[submissionIndex].teacher = {
            id: window.currentUser.id,
            name: window.currentUser.name,
            score: teacherScore,
        };
        // window.appData.answers[answerIndex].submissions[submissionIndex].teacherScore = teacherScore;
        window.appData.answers[answerIndex].submissions[submissionIndex].subjectiveScore = subjectiveScore;
        window.appData.answers[answerIndex].submissions[submissionIndex].totalScore = totalScore;
    }
    // console.log(window.appData.answers);
    // 保存文件
    // console.log(window.appData.grading);    
    // saveToFile('/api/save-grading', window.appData.grading);
    saveToFile('/api/save-results', window.appData.results);
    saveToFile('/api/save-answers', window.appData.answers);
    //console.log(currentGradingPaper);//批改考生答题信息
    // renderResultsTable();//成绩渲染 

    // 提示成功
    showActionMessage(`试卷批改完成！总分：${totalScore}`);

    // 关闭模态框
    setTimeout(() => {
        closeGradingModal();
        // 更新试卷列表状态
        renderGradingTable();
        //renderGradingList();
    }, 1500);
}

// 关闭批改模态框
function closeGradingModal() {
    // 隐藏模态框
    document.getElementById('gradingModal').style.display = 'none';
    
    // 重置状态变量
    currentGradingPaper = null;
    
    // 清空题目容器
    const container = document.getElementById('questionsContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    // 移除事件监听器
    const closeBtn = document.querySelector('#gradingModal .close-modal');
    if (closeBtn) {
        // 先移除所有事件监听器
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    }
    
    // 重置当前批改模式
    window.gradingModule.currentGradingMode = true;
}

// 挂载函数到window对象
window.gradingModule.openGradingModal = openGradingModal;
window.gradingModule.closeGradingModal = closeGradingModal;
window.gradingModule.submitGrading = submitGrading;

// 导出模块函数
export { renderGradingTable, openGradingModal, closeGradingModal, submitGrading };

/**
 * 合并两个JSON对象，B的属性会覆盖A的同名属性
 * 特别处理case-analysis类型题目，将userAnswer拆分到对应子题目
 * @param {Object} a - A.json对象(questions)
 * @param {Object} b - B.json对象(submission.answers)
 * @returns {Array.<Object>} 合并后的JSON对象数组
 */
function mergeJsonData(a, b) {
    // 创建a和b的深拷贝，避免修改原始数据
    const aCopy = JSON.parse(JSON.stringify(a));
    const bCopy = JSON.parse(JSON.stringify(b));

    // 如果a不是数组，则将其包装成数组
    const aArray = Array.isArray(aCopy) ? aCopy : [aCopy];
    // 如果b不是数组，则将其包装成数组
    const bArray = Array.isArray(bCopy) ? bCopy : [bCopy];

    const result = [];

    // 合并两个数组的元素
    for (let i = 0; i < Math.max(aArray.length, bArray.length); i++) {
        const aItem = aArray[i] || {};
        const bItem = bArray[i] || {};
        const mergedItem = { ...aItem };

        // 处理case-analysis类型题目，将userAnswer拆分到子题目
        if (mergedItem.type === 'case-analysis' && Array.isArray(mergedItem.questions) && bItem.userAnswer) {
            // 假设userAnswer是数组，按顺序对应子题目
            if (Array.isArray(bItem.userAnswer)) {
                mergedItem.questions.forEach((subQ, index) => {
                    if (index < bItem.userAnswer.length) {
                        subQ.userAnswer = bItem.userAnswer[index];
                    }
                });
            }
            // 删除主题目上的userAnswer，避免混淆
            delete bItem.userAnswer;
        }

        for (const key in bItem) {
            if (Object.prototype.hasOwnProperty.call(bItem, key)) {
                if (bItem[key] && typeof bItem[key] === 'object' && !Array.isArray(bItem[key])) {
                    mergedItem[key] = mergeJsonData(mergedItem[key] || {}, bItem[key]);
                } else {
                    mergedItem[key] = bItem[key];
                }
            }
        }
        result.push(mergedItem);
    }

    return result;
}

//gradingModal.style.display = 'none';