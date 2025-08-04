import { showActionMessage } from '../utils/format.js';
import { formatDateTimeLocal } from '../utils/format.js';
import { renderExamCards } from '../modules/examRender.js';
import { saveToFile } from '../utils/helpers.js';

// let currentImportQuestions = [];
// 渲染管理表格
function renderManagementTable() {
    const container = document.getElementById('examManagementTable');
    container.innerHTML = '';

    const rows = [];
    // 确保考试数据已加载
    if (!window.appData || !window.appData.exams) {
        showActionMessage('考试数据加载失败，请刷新页面重试', true);
        return;
    }

    /**
     * 更新所有考试的状态
     */
    function updateAllExamStatus() {
        if (!window.appData || !window.appData.exams) {
            console.error('考试数据未加载，无法更新考试状态');
            return;
        }

        const now = new Date();
        let statusUpdated = false;

        window.appData.exams.forEach(exam => {
            const startDate = new Date(exam.startTime);
            const endDate = new Date(exam.endTime);
            let newStatus = exam.status;

            // 根据时间更新状态
            if (now >= startDate && now <= endDate) {
                newStatus = "进行中";
            } else if (now > endDate) {
                newStatus = "已完成";
            } else {
                newStatus = "未开始";
            }

            // 如果状态发生变化，则更新
            if (newStatus !== exam.status) {
                exam.status = newStatus;
                statusUpdated = true;
                console.log(`考试 "${exam.title}" 状态已更新为: ${newStatus}`);
            }
        });

        // 如果有状态更新，则保存数据并刷新UI
        if (statusUpdated) {
            saveToFile('/api/save-exams', window.appData.exams);
            // 如果当前在考试列表页面，则刷新列表
            if (document.getElementById('examsSection')?.classList.contains('active')) {
                renderExamCards();
            }
        }
    }

    // 将函数挂载到window对象，供config.js调用
    window.updateAllExamStatus = updateAllExamStatus;

    window.appData.exams.forEach(exam => {
        let statusColor = exam.status === "未开始" ? "#e67e22" :
            exam.status === "进行中" ? "#27ae60" : "#3498db";

        const row = `
                        <tr>
                            <td>${exam.title}</td>
                            <td>${exam.type}</td>
                            <td>${exam.questionsNum}</td>
                            <td style="color: ${statusColor};">${exam.status}</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn btn-outline edit-exam" data-id="${exam.id}" style="padding: 5px 10px; font-size: 14px;">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-import import-exam" data-id="${exam.id}" style="padding: 5px 10px; font-size: 14px;">
                                        <i class="fas fa-file-export"></i> 导入
                                    </button>
                                    <button class="btn btn-export export-exam" data-id="${exam.id}" style="padding: 5px 10px; font-size: 14px;">
                                        <i class="fas fa-file-export"></i> 导出
                                    </button>
                                    <button class="btn btn-danger delete-exam" data-id="${exam.id}" style="padding: 5px 10px; font-size: 14px;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;

        rows.push(row);
    });
    container.innerHTML = rows.join('');

    // 添加编辑和删除事件监听
    document.querySelectorAll('.edit-exam').forEach(btn => {
        btn.addEventListener('click', function () {
            const examId = this.getAttribute('data-id');
            openEditExamModal(examId);
        });
    });

    document.querySelectorAll('.delete-exam').forEach(btn => {
        btn.addEventListener('click', function () {
            const examId = this.getAttribute('data-id');
            deleteExam(examId);
        });
    });

    // 添加导出事件监听
    document.querySelectorAll('.export-exam').forEach(btn => {
        btn.addEventListener('click', function () {
            const examId = this.getAttribute('data-id');
            //console.log(examId);
            exportExam(examId);
        });
    });

    // 添加导入事件监听
    document.querySelectorAll('.import-exam').forEach(btn => {
        btn.addEventListener('click', function () {
            const examId = this.getAttribute('data-id');
            importExam(examId);
        });
    });
}

function openEditExamModal(examId) {
    const exam = window.appData.exams.find(e => e.id.toString() === examId.toString());
    if (exam) {
        document.getElementById('examId').value = exam.id;
        document.getElementById('examName').value = exam.title;
        document.getElementById('examType').value = exam.type;
        document.getElementById('questionCount').value = exam.questionsNum;
        document.getElementById('examDuration').value = exam.duration;
        document.getElementById('startTime').value = formatDateTimeLocal(exam.startTime);
        document.getElementById('endTime').value = formatDateTimeLocal(exam.endTime);
        document.getElementById('examDescription').value = exam.description;

        modalTitle.textContent = '编辑考试';
        examModal.style.display = 'flex';
    }
}

function deleteExam(examId) {
    // console.log(examId);
    // console.log(window.appData.exams);
    const exam = window.appData.exams.find(e => e.id.toString() === examId.toString());
    if (!exam) {
        // showErrorMessage('考试不存在或已被删除');
        showActionMessage('考试不存在或已被删除', true);
        return;
    }
    if (confirm('确定要删除这个考试吗？此操作不可恢复！')) {
        const examIndex = window.appData.exams.findIndex(e => e.id.toString() === examId).toString();
        if (examIndex !== -1) {
            window.appData.exams.splice(examIndex, 1);
            showActionMessage('考试已删除');
            saveToFile('/api/save-exams', window.appData.exams);
            renderExamCards();
            renderManagementTable();
        }
    }
}

// 导入考试试卷
function importExam(examId) {
    //alert("导入题库");    
    const examIndex = window.appData.exams.findIndex(e => e.id.toString() === examId.toString());
    // console.log(examIndex)
    if (examIndex !== -1) {
        // console.log(window.currentImportQuestions);
        window.appData.exams[examIndex].questions = window.currentImportQuestions;//修改题库
    }
    //exams[examId - 1].questions = currentImportQuestions;//修改题库
    // 重新写入exams文件
    saveToFile('/api/save-exams', window.appData.exams);
    renderExamCards();
    showActionMessage('试题数据导入成功');
    //importQuestions()
}

// 导出考试试卷
function exportExam(examId) {
    const exam = window.appData.exams.find(e => e.id == examId);
    if (!exam) return;

    // 确认导出
    if (!confirm(`确定要导出"${exam.title}"的试卷吗？`)) {
        return;
    }

    // 生成试卷HTML内容
    const htmlContent = generateExamHTML(exam);

    // 创建Blob
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.title.replace(/\s+/g, '_')}_试卷.html`;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);

    showActionMessage(`"${exam.title}"试卷导出成功！`);
}

function displayFileInfo(file) {
    fileName.textContent = file.name;

    // 格式化文件大小
    const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    fileSize.textContent = `${fileSizeInMB} MB`;

    fileInfo.style.display = 'block';
    importBtn.disabled = false;
}

// 预览试题函数（支持所有题型）
function previewQuestions(questions) {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.style.display = 'block';
    // 生成预览HTML
    let previewHTML = '';

    questions.forEach(question => {
        let typeLabel = '';
        let typeClass = '';

        switch (question.type) {
            case 'single':
                typeLabel = '单选题';
                typeClass = 'single-type';
                break;
            case 'multiple':
                typeLabel = '多选题';
                typeClass = 'multiple-type';
                break;
            case 'judge':
                typeLabel = '判断题';
                typeClass = 'judge-type';
                break;
            case 'fill-blank':
                typeLabel = '填空题';
                typeClass = 'fill-type';
                break;
            case 'short-answer':
                typeLabel = '简答题';
                typeClass = 'answer-type';
                break;
            case 'case-analysis':
                typeLabel = '分析题';
                typeClass = 'analysis-type';
                break;
        }

        previewHTML += `
                                                        <div class="question-preview">
                                                            <div class="question-header">
                                                                <div><strong>${question.id}.</strong> ${question.text}</div>
                                                                <div class="question-type ${typeClass}">${typeLabel}</div>
                                                            </div>
                                                    `;

        // 案例分析题特殊处理
        if (question.type === 'case-analysis') {
            previewHTML += `
                                                            <div class="case-text">${question.caseText}</div>
                                                        `;
        }

        // 处理选项型题目
        if (question.type === 'single' || question.type === 'multiple') {
            previewHTML += `<div class="options-list">`;
            question.options.forEach((opt, index) => {
                previewHTML += `<div class="option-item">${String.fromCharCode(65 + index)}. ${opt}</div>`;
            });
            previewHTML += `</div>`;

            if (question.type === 'single') {
                previewHTML += `<div class="preview-answer"><strong>正确答案:</strong> ${question.correctAnswer}</div>`;
                previewHTML += `<div class="preview-answer"><strong>解析:</strong> ${question.explanation}</div>`;
            } else {
                previewHTML += `<div class="preview-answer"><strong>正确答案:</strong> ${question.correctAnswer.join(', ')}</div>`;
                previewHTML += `<div class="preview-answer"><strong>解析:</strong> ${question.explanation}</div>`;
            }
        }

        if (question.type === 'judge') {
            previewHTML += `
                                                    <div class="options-list">
                                                        <div class="option-item">A. 正确</div>
                                                        <div class="option-item">B. 错误</div>
                                                    </div>`;
            previewHTML += `<div class="preview-answer"><strong>正确答案:</strong> ${question.correctAnswer}</div>`;
            previewHTML += `<div class="preview-answer"><strong>解析:</strong> ${question.explanation}</div>`;
        }

        // 处理填空题
        if (question.type === 'fill-blank') {
            previewHTML += `<div class="preview-answer"><strong>正确答案:</strong> ${question.correctAnswer.join(', ')}</div>`;
            previewHTML += `<div class="preview-answer"><strong>解析:</strong> ${question.explanation}</div>`;
        }

        // 处理简答题
        if (question.type === 'short-answer') {
            previewHTML += `
                                <div class="preview-answer"><strong>参考答案:</strong> ${question.correctAnswer}</div>
                                <div class="preview-answer"><strong>解析:</strong> ${question.explanation}</div>
                            `;
        }

        // 处理分析题的子问题
        if (question.type === 'case-analysis') {
            previewHTML += `<div class="sub-questions">`;
            question.questions.forEach(subQ => {
                // 为子问题添加选项显示
                let subOptionsHtml = '';

                // 根据子问题类型生成选项内容
                switch (subQ.type) {
                    case 'single':
                    case 'multiple':
                        subOptionsHtml = `<div class="options-list">`;
                        subQ.options.forEach((opt, idx) => {
                            subOptionsHtml += `<div class="option-item">${String.fromCharCode(65 + idx)}. ${opt}</div>`;
                        });
                        subOptionsHtml += `</div>`;
                        break;

                    case 'judge':
                        subOptionsHtml = `
                                                        <div class="options-list">
                                                            <div class="option-item">A. 正确</div>
                                                            <div class="option-item">B. 错误</div>
                                                        </div>`;
                        break;
                }

                if (subQ.type === 'short-answer') {
                    previewHTML += `
                                                    <div class="sub-question">
                                                        <div><strong>${subQ.id}.</strong> ${subQ.text}</div>
                                                        ${subOptionsHtml}
                                                        <div class="preview-answer"><strong>参考答案:</strong> ${subQ.correctAnswer}</div>
                                                        <div class="preview-answer"><strong>解析:</strong> ${subQ.explanation}</div>
                                                        <div class="preview-points">分值: ${subQ.points}</div>
                                                    </div>
                                                    `;
                } else {
                    previewHTML += `
                                                    <div class="sub-question">
                                                        <div><strong>${subQ.id}.</strong> ${subQ.text}</div>
                                                        ${subOptionsHtml}
                                                        <div class="preview-answer"><strong>正确答案:</strong> ${subQ.correctAnswer}</div>
                                                        <div class="preview-answer"><strong>解析:</strong> ${subQ.explanation}</div>
                                                        <div class="preview-points">分值: ${subQ.points}</div>
                                                    </div>
                                                    `;
                }
            });
            previewHTML += `</div>`;
        }

        // 显示分值
        previewHTML += `<div class="preview-points">分值: ${question.points}</div>`;

        previewHTML += `</div>`; // 结束question-preview
    });

    questionPreview.innerHTML = previewHTML;
    previewContainer.style.display = 'block';

    // 渲染数学公式
    MathJax.typeset();
}

// 生成试卷HTML
import { Config } from './config.js';

function generateExamHTML(exam) {
    // 辅助函数：生成单个题目的HTML，包含答案显示逻辑
    function generateQuestionHTML(question, index) {
        let questionHTML = `
                                    <div class="question">
                                        <div class="question-header" style="display: flex; justify-content: space-between; align-items: center;">
                                            <div class="question-title">${index}. ${question.text}</div>
                                            <div class="question-points">${question.points}分</div>
                                        </div>
                                `;

        // 根据题型生成不同的内容
        switch (question.type) {
            case 'single':
            case 'multiple':
                questionHTML += `
                                    <div class="options-list">
                                        ${question.options.map((opt, i) => `
                                            <div class="option-item">${String.fromCharCode(65 + i)}. ${opt}</div>
                                        `).join('')}
                                    </div>
                                `;
                break;

            case 'judge':
                questionHTML += `
                                    <div class="options-list">
                                        <div class="option-item">A. 正确</div>
                                        <div class="option-item">B. 错误</div>
                                    </div>
                                `;
                break;

            case 'fill-blank':
                if (!(Config.isIncludeAnswersInExportEnabled() && question.correctAnswer !== undefined)) {
                    questionHTML += `
                                    <div class="blanks-container">
                                        ${question.placeholders.map((_, i) => `
                                            <div class="blank-item">${i + 1}. ____________</div>
                                        `).join('')}
                                    </div>
                                `;
                };
                break;

            case 'short-answer':
                if (!(Config.isIncludeAnswersInExportEnabled() && question.correctAnswer !== undefined)) {
                    questionHTML += `
                                    <div class="short-answer-blank" style="height: 150px; border-bottom: 1px solid #ccc; margin-top: 10px;"></div>
                                `;
                };
                break;

            case 'case-analysis':
                questionHTML += `
                                    <div class="case-analysis" style="margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #9c27b0;">
                                        <!-div class="case-title" style="font-weight: bold; margin-bottom: 5px;"></div-->
                                        <div class="case-text">${question.caseText}</div>
                                    </div>
                                    <div class="sub-questions">
                                        ${question.questions.map((subQ, subIndex) => `
                                            <div class="sub-question" style="margin-top: 15px; padding-left: 20px; border-left: 2px dashed #9c27b0;">
                                                <div class="question-header" style="font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
                                                    <div class="question-title">${index}.${subIndex + 1} ${subQ.text}</div>
                                                    <div class="question-points">${subQ.points}分</div>
                                                </div>
                                                ${generateSubQuestionHTML(subQ)}
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                break;
        }

        // 如果启用了答案显示，则添加答案部分
        // console.log(Config.isIncludeAnswersInExportEnabled());
        // console.log(question);
        // console.log(question.correctAnswer);
        if (Config.isIncludeAnswersInExportEnabled() && question.correctAnswer !== undefined) {
            questionHTML += `
                                <div class="question-answer" style="margin-top: 15px; padding: 10px; background-color: #f0f7ff; border-left: 3px solid #4285f4;">
                                    <div class="answer-title" style="font-weight: bold; color: #4285f4; margin-bottom: 5px;">参考答案：</div>
                                    <div class="answer-content">
                                        ${formatAnswer(question)}
                                    </div>
                                    ${question.explanation ? `
                                    <div class="explanation-title" style="font-weight: bold; color: #ff9800; margin-top: 10px; margin-bottom: 5px;">答案解析：</div>
                                    <div class="explanation-content">
                                        ${question.explanation}
                                    </div>` : ''}
                                </div>
                            `;
        }

        questionHTML += `</div>`;
        return questionHTML;
    }

    // 辅助函数：格式化答案显示
    function formatAnswer(question) {
        let answerHTML = '';

        switch (question.type) {
            case 'single':
            case 'multiple':
                const answers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
                answerHTML = answers.map(ans => {
                    const optIndex = parseInt(ans) - 1;
                    return question.options && optIndex >= 0 && optIndex < question.options.length
                        ? `${String.fromCharCode(65 + optIndex)}. ${question.options[optIndex]}`
                        : ans;
                }).join(', ');
                break;

            case 'judge':
                answerHTML = String(question.correctAnswer).toUpperCase() === 'A' ? '正确' : '错误';
                break;

            case 'fill-blank':
                if (Array.isArray(question.correctAnswer)) {
                    answerHTML = question.correctAnswer.map((ans, i) => `${i + 1}. ${ans}`).join('<br>');
                } else {
                    answerHTML = question.correctAnswer;
                }
                break;

            case 'short-answer':
            case 'case-analysis':
                answerHTML = question.correctAnswer || '略';
                break;

            default:
                answerHTML = question.correctAnswer || '';
        }

        return answerHTML;
    }

    // 辅助函数：生成子问题的HTML
    function generateSubQuestionHTML(subQ) {
        let subHtml = '';

        switch (subQ.type) {
            case 'single':
            case 'multiple':
                subHtml += `
                                <div class="options-list">
                                    ${subQ.options.map((opt, i) => `
                                        <div class="option-item">${String.fromCharCode(65 + i)}. ${opt}</div>
                                    `).join('')}
                                </div>
                            `;
                break;

            case 'judge':
                subHtml += `
                                <div class="options-list">
                                    <div class="option-item">A. 正确</div>
                                    <div class="option-item">B. 错误</div>
                                </div>
                            `;
                break;

            case 'fill-blank':
                subHtml += `
                                <div class="blanks-container">
                                    ${subQ.placeholders.map((_, i) => `
                                        <div class="blank-item">${i + 1}. ____________</div>
                                    `).join('')}
                                </div>
                            `;
                break;

            case 'short-answer':
                if (!(Config.isIncludeAnswersInExportEnabled() && subQ.correctAnswer !== undefined)) {
                    subHtml += `
                                <div class="short-answer-blank" style="height: 100px; border-bottom: 1px solid #ccc; margin-top: 10px;"></div>
                            `;
                };
                break;
        }

        // 如果启用了答案显示，则添加答案部分
        if (Config.isIncludeAnswersInExportEnabled() && subQ.correctAnswer !== undefined) {
            subHtml += `
                                <div class="question-answer" style="margin-top: 10px; padding: 8px; background-color: #f0f7ff; border-left: 3px solid #4285f4;">
                                    <div class="answer-title" style="font-weight: bold; color: #4285f4; margin-bottom: 3px; font-size: 14px;">参考答案：</div>
                                    <div class="answer-content" style="font-size: 14px;">
                                        ${formatAnswer(subQ)}
                                    </div>
                                    ${subQ.explanation ? `
                                    <div class="explanation-title" style="font-weight: bold; color: #ff9800; margin-top: 8px; margin-bottom: 3px; font-size: 14px;">答案解析：</div>
                                    <div class="explanation-content" style="font-size: 14px;">
                                        ${subQ.explanation}
                                    </div>` : ''}
                                </div>
                            `;
        }

        return subHtml;
    }

    // 生成试卷HTML内容
    return `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>${exam.title}</title>
                <!--script type="text/javascript" charset=utf-8 defer="defer" src='../../vendor/mathjax.js'></script-->
                <script id="MathJax-script" src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
                <style>
                    body {
                        font-family: 'Microsoft YaHei', sans-serif;
                        line-height: 1.6;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .exam-header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #3498db;
                    }
                    .exam-title {
                        font-size: 24px;
                        color: #2c3e50;
                        margin-bottom: 10px;
                    }
                    .exam-info {
                        display: flex;
                        justify-content: center;
                        gap: 30px;
                        margin-top: 15px;
                        font-size: 14px;
                        color: #7f8c8d;
                    }
                    .question {
                        margin-bottom: 30px;
                        page-break-inside: avoid;
                    }
                    .question-header {
                        margin-bottom: 10px;
                        font-weight: 600;
                    }
                    .options-list {
                        padding-left: 20px;
                    }
                    .option-item {
                        margin: 8px 0;
                    }
                    .blanks-container {
                        margin-top: 10px;
                    }
                    .blank-item {
                        margin: 5px 0;
                    }
                    .page-break {
                        page-break-before: always;
                        margin-top: 30px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        color: #7f8c8d;
                        font-size: 14px;
                    }
                    .case-analysis {
                        margin: 15px 0;
                        padding: 10px;
                        background: #f9f9f9;
                        border-left: 3px solid #9c27b0;
                    }
                    .case-title {
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .sub-question {
                        margin-top: 15px;
                        padding-left: 20px;
                        border-left: 2px dashed #9c27b0;
                    }
                    .question-answer {
                        margin-top: 15px;
                        padding: 10px;
                        background-color: #f0f7ff;
                        border-left: 3px solid #4285f4;
                    }
                    .answer-title {
                        font-weight: bold;
                        color: #4285f4;
                        margin-bottom: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="exam-header">
                    <div class="exam-title">${exam.title}</div>
                    <div class="exam-description">${exam.description}</div>
                    <div class="exam-info">
                        <div>考试时长: ${exam.duration}分钟</div>
                        <div>题目数量: ${exam.questionsNum}题</div>
                        <div>考试类型: ${exam.type}</div>
                    </div>
                </div>

                <div class="questions-container">
                    ${exam.questions.map((q, index) => `
                        ${generateQuestionHTML(q, index + 1)}
                        ${(index + 1) % 5 === 0 ? `<div class="page-break"></div>` : ''}
                    `).join('')}
                </div>

                <div class="footer">
                    <p>© ${new Date().getFullYear()} 职工在线考试系统 | 试卷生成时间: ${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
            `;
}

// 考试管理功能
export function openCreateExamModal() {
    // 重置表单
    const examForm = document.getElementById('examForm');
    const modalTitle = document.getElementById('modalTitle');
    const examModal = document.getElementById('examModal');

    examForm.reset();
    document.getElementById('examId').value = '';
    modalTitle.textContent = '创建新考试';
    examModal.style.display = 'flex';
}

function saveExam() {
    // 获取表单数据
    // console.log("saveExam函数被调用 - " + new Date().toISOString());    
    const examId = document.getElementById('examId').value;
    const title = document.getElementById('examName').value;
    const type = document.getElementById('examType').value;
    const questionsNum = parseInt(document.getElementById('questionCount').value);
    const duration = parseInt(document.getElementById('examDuration').value);
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const description = document.getElementById('examDescription').value;

    // 验证表单数据
    if (!title || !type || isNaN(questionsNum) || isNaN(duration) || !startTime || !endTime) {
        showActionMessage('请填写所有必填字段', true);
        return;
    }

    // 更新考试状态
    const now = new Date();
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    let status = "未开始";
    if (now >= startDate && now <= endDate) {
        status = "进行中";
    } else if (now > endDate) {
        status = "已完成";
    }

    // console.log(examId);
    if (examId) {
        // 更新现有考试
        if (!window.appData || !window.appData.exams) {
            showActionMessage('考试数据加载失败，请刷新页面重试', true);
            return;
        }

        const examIndex = window.appData.exams.findIndex(e => e.id.toString() === examId.toString());
        // console.log(examIndex);
        // console.log(isPracticeMode);
        if (examIndex !== -1) {
            window.appData.exams[examIndex] = {
                ...window.appData.exams[examIndex],
                title,
                type,
                duration,
                questionsNum,
                status,
                startTime,
                endTime,
                description,
                isPracticeMode: window.isPracticeMode,
                isAllowStudentsViewAnswers: window.isAllowStudentsViewAnswers
            };
            // console.log(window.appData.exams[examIndex]);             
            showActionMessage('考试信息更新成功');
        }
    } else {
        // 创建新考试
        const newId = Math.max(...window.appData.exams.map(e => e.id), 0) + 1;
        window.appData.exams.push({
            id: newId,
            title,
            type,
            duration,
            questionsNum,
            status,
            startTime,
            endTime,
            description,
            isPracticeMode: window.isPracticeMode,
            "isAllowStudentsViewAnswers": window.isAllowStudentsViewAnswers
        });
        showActionMessage('新考试创建成功');
    }
    // 保存到文件
    // console.log(window.appData.exams);
    saveToFile('/api/save-exams', window.appData.exams);
    renderExamCards();
    // 重新渲染管理表格
    renderManagementTable();
    // 关闭模态框
    closeExamModal();
}

function closeExamModal() {
    const examModal = document.getElementById('examModal');
    examModal.style.display = 'none';
}

export function closeAllModals() {
    const examModal = document.getElementById('examModal');
    const importModal = document.getElementById('importModal');
    // 添加对批改模态框的处理
    document.getElementById('gradingModal').style.display = 'none';

    examModal.style.display = 'none';
    importModal.style.display = 'none';
}

export { renderManagementTable, displayFileInfo, previewQuestions, closeExamModal, saveExam, saveToFile };//, openEditExamModal, deleteExam, importExam, exportExam