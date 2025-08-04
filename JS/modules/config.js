import { showActionMessage, formatDateTime } from '../utils/format.js';
import { sortResultsByTotalScoreDesc } from '../utils/helpers.js';
// import { clearAnswersData, clearResultsData } from '../services/dataService.js';
// import { DataService } from '../services/dataService.js';
import { encryptData, ENCRYPTION_KEY } from '../utils/helpers.js';
import { saveToFile } from '../utils/helpers.js';

// DOM元素加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化清除按钮事件监听
    initClearButtons();
    // 初始化开关状态
    initToggles();
    // 初始化文件上传
    initFileUpload();
    // 初始化导出按钮
    initExportButton();
    // 初始化导出答案按钮
    initExportAnswersButton();
    // 初始化导入按钮
    initImportButton();

    // 函数：初始化下拉列表
    function initializeSelects() {
        const examSelect = document.getElementById('examSelect');
        const studentSelect = document.getElementById('studentSelect');
        if (examSelect) initExamSelect(examSelect);
        if (studentSelect) initStudentSelect(studentSelect);
    }

    // 初始加载数据
    if (window.appData && window.appData.exams && window.appData.users) {
        initializeSelects();
    }

    // 监听数据加载完成事件
    document.addEventListener('appDataLoaded', () => {
        initializeSelects();
    });

    // 定期检查数据是否加载完成（防止appDataLoaded事件未触发）
    const checkDataInterval = setInterval(() => {
        if (window.appData && window.appData.exams && window.appData.users) {
            initializeSelects();
            clearInterval(checkDataInterval);
        }
    }, 500);
    // 10秒后停止检查
    setTimeout(() => clearInterval(checkDataInterval), 10000);
})

/**
 * 初始化导出考试成绩按钮事件
 */
function initExportButton() {
    const exportBtn = document.getElementById('exportResultsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportResultsToExcel();
        });
    }
}

/**
 * 初始化导出考生答案按钮事件
 */
function initExportAnswersButton() {
    const exportBtn = document.getElementById('exportAnswersBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportAnswersToJson();
        });
    }
}

/**
 * 导出考生答案到JSON文件
 */
function exportAnswersToJson() {
    // 检查数据是否存在
    if (!window.appData || !window.appData.answers || window.appData.answers.length === 0) {
        showActionMessage('没有可导出的考生答案数据', true);
        return;
    }

    try {
        // 格式化JSON数据
        const jsonData = JSON.stringify(window.appData.answers, null, 2);

        // 创建Blob对象
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = '学生考试答案.json';
        document.body.appendChild(a);
        a.click();

        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);

        showActionMessage('考生答案导出成功', false);
    } catch (error) {
        showActionMessage('导出考生答案失败: ' + error.message, true);
        console.error('导出JSON错误:', error);
    }
}

/**
 * 导出考试成绩到Excel文件
 */
function exportResultsToExcel() {
    // 检查数据是否存在
    if (!window.appData || !window.appData.results || window.appData.results.length === 0) {
        showActionMessage('没有可导出的考试成绩数据', true);
        return;
    }

    try {
        // 准备导出数据
        window.appData.results = sortResultsByTotalScoreDesc(window.appData.results);
        // console.log(window.appData.results);
        const exportData = window.appData.results.map(result => ({
            '排名': result.rank || '',
            '学号': result.userId || '',
            '姓名': result.userName || '',
            '考试编号': result.examId || '',
            '考试名称': result.examName || '',
            '客观题分数': result.objectiveScore || 0,
            '主观题分数': result.subjectiveScore || 0,
            '总分数': result.totalScore || 0,
            '用时': result.examTime || '',
            '状态': result.examStatus || '',
            '提交时间': formatDateTime(result.endTime || '')
        }));

        // 创建工作表
        const ws = XLSX.utils.json_to_sheet(exportData);

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '考试成绩');

        // 弹出保存文件对话框
        XLSX.writeFile(wb, '学生考试成绩.xlsx');

        showActionMessage('考试成绩导出成功', false);
    } catch (error) {
        showActionMessage('导出考试成绩失败: ' + error.message, true);
        console.error('导出Excel错误:', error);
    }
}

/**
 * 初始化导入按钮事件
 */
function initImportButton() {
    const importBtn = document.getElementById('importUserDataBtn');
    const fileInput = document.getElementById('userDataUpload');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
}

/**
 * 初始化文件上传控件 - 用户数据上传
 */
function initFileUpload() {
    // 获取DOM元素
    const fileInput = document.getElementById('userDataUpload');
    const fileNameDisplay = document.getElementById('fileSelectedName');

    // 检查元素是否存在
    if (!fileInput || !fileNameDisplay) {
        console.error('文件上传控件或文件名显示元素未找到');
        return;
    }

    // 文件输入控件重置辅助函数
    const resetFileInput = () => {
        fileInput.value = '';
        fileNameDisplay.textContent = '';
    };

    // 定义文件选择处理函数
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 显示选择的文件名
        fileNameDisplay.textContent = file.name;

        try {
            // 使用SheetJS解析Excel文件
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // 使用header:1获取表头
                    const jsonDataWithHeader = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                    // 验证表头是否包含必需字段
                    const requiredHeaders = ['id', 'name', 'password', 'role'];
                    const headers = jsonDataWithHeader[0]; // 第一行为表头

                    // 检查必需字段
                    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
                    if (missingHeaders.length > 0) {
                        showActionMessage(`导入失败：表格缺少必需的表头字段: ${missingHeaders.join(', ')}`, true);
                        resetFileInput();
                        return;
                    }

                    // 处理数据行（跳过表头）
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 0, defval: '' });
                    const cleanData = jsonData.map(item => {
                        const { __rowNum__, ...cleanItem } = item;
                        return cleanItem;
                    });

                    // 加密密码并构建用户对象
                    const users = {};
                    for (const row of cleanData) {
                        // 确保行数据包含所有必需字段
                        const hasAllRequiredFields = requiredHeaders.every(field => row[field] !== undefined);
                        if (!hasAllRequiredFields) {
                            console.warn(`跳过无效行数据: ${JSON.stringify(row)}`);
                            continue;
                        }

                        row.password = encryptData(row["password"], ENCRYPTION_KEY);
                        users[row["id"]] = row;
                    }

                    // 导入用户数据
                    saveToFile('/api/save-users', users);
                    showActionMessage('用户数据导入成功', false);
                    resetFileInput();
                } catch (error) {
                    showActionMessage(`处理文件数据时出错: ${error.message}`, true);
                    console.error('文件处理错误:', error);
                    resetFileInput();
                }
            };

            reader.onerror = () => {
                showActionMessage('文件读取失败', true);
                console.error('文件读取错误:', reader.error);
                resetFileInput();
            };

            reader.readAsArrayBuffer(file);
        } catch (error) {
            showActionMessage('用户数据导入失败: ' + error.message, true);
            console.error('导入错误:', error);
            resetFileInput();
        }
    };

    // 添加事件监听器
    fileInput.addEventListener('change', handleFileSelect);
}

/**
 * 初始化清除数据按钮事件
 */
function initClearButtons() {
    // 清除answers.json按钮
    const clearAnswersBtn = document.getElementById('clearAnswersBtn');
    if (clearAnswersBtn) {
        clearAnswersBtn.addEventListener('click', async () => {
            if (confirm('确定要清除所有答题数据吗？此操作不可恢复！')) {
                try {
                    // await clearAnswersData();
                    saveToFile('/api/save-answers', []);
                    showActionMessage('答题数据已成功清除', false);
                } catch (error) {
                    showActionMessage('清除答题数据失败: ' + error.message, true);
                }
            }
        });
    }

    // 清除results.json按钮
    const clearResultsBtn = document.getElementById('clearResultsBtn');
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', async () => {
            if (confirm('确定要清除所有考试结果数据吗？此操作不可恢复！')) {
                try {
                    // await clearResultsData();
                    saveToFile('/api/save-results', []);
                    showActionMessage('考试结果数据已成功清除', false);
                } catch (error) {
                    showActionMessage('清除考试结果数据失败: ' + error.message, true);
                }
            }
        });
    }

    // 初始化删除指定考生考试数据按钮
    initDeleteExamDataButton();
}

/**
 * 初始化删除指定考生考试数据按钮
 */
function initDeleteExamDataButton() {
    // 获取DOM元素
    const examSelect = document.getElementById('examSelect');
    const studentSelect = document.getElementById('studentSelect');
    const deleteBtn = document.getElementById('deleteExamDataBtn');

    if (!examSelect || !studentSelect || !deleteBtn) return;

    // 添加删除按钮事件监听
    deleteBtn.addEventListener('click', async () => {
        const examId = examSelect.value;
        const userId = studentSelect.value;

        if (!examId || !userId) {
            showActionMessage('请选择考试科目和考生', true);
            return;
        }

        if (confirm('确定要删除该考生的考试数据吗？此操作不可恢复！')) {
            try {
                // 删除answers.json中的数据
                // console.log(examId, userId);
                await deleteExamData('answers', examId, userId);
                // 删除results.json中的数据
                await deleteExamData('results', examId, userId);
                showActionMessage('考试数据已成功删除', false);
            } catch (error) {
                showActionMessage('删除考试数据失败: ' + error.message, true);
            }
        }
    });
}

/**
 * 初始化考试科目下拉列表
 */
function initExamSelect(selectElement) {
    // console.log(window.appData.exams);
    if (!window.appData || !window.appData.exams) return;

    // 清空下拉列表
    selectElement.innerHTML = '<option value="">请选择考试科目</option>';

    // 添加考试选项
    Object.values(window.appData.exams).forEach(exam => {
        const option = document.createElement('option');
        option.value = exam.id.toString();
        option.textContent = `(${exam.id})${exam.title}`;//name;
        selectElement.appendChild(option);
    });

    // 添加选择事件监听
    selectElement.addEventListener('change', function () {
        const examId = this.value;
        const examInfoDiv = document.getElementById('examInfo');
        const examNameInfo = document.getElementById('examNameInfo');
        const examIDInfo = document.getElementById('examIDInfo');
        const examDescriptionInfo = document.getElementById('examDescriptionInfo');
        // const examTypeInfo = document.getElementById('examTypeInfo');
        // const examDurationInfo = document.getElementById('examDurationInfo');
        // const examStartTimeInfo = document.getElementById('examStartTimeInfo');
        // const examEndTimeInfo = document.getElementById('examEndTimeInfo');

        if (examId && window.appData.exams[examId - 1]) {
            const exam = window.appData.exams[examId - 1];
            // 修复考试信息显示错位问题
            examNameInfo.textContent = exam.title || '-';
            examIDInfo.textContent = exam.id || '-';
            examDescriptionInfo.textContent = exam.description || '-';
            // examTypeInfo.textContent = exam.type || '-';
            // examDurationInfo.textContent = exam.duration || '-';
            // examStartTimeInfo.textContent = formatDateTime(exam.startTime) || '-';
            // examEndTimeInfo.textContent = formatDateTime(exam.endTime) || '-';
            examInfoDiv.style.display = 'block';
        } else {
            examInfoDiv.style.display = 'none';
        }
    });
}

/**
 * 初始化考生下拉列表
 */
function initStudentSelect(selectElement) {
    if (!window.appData || !window.appData.users) return;

    // 清空下拉列表
    selectElement.innerHTML = '<option value="">请选择考生</option>';

    // 添加考生选项
    Object.values(window.appData.users).forEach(user => {
        if (user.role === 'student') {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `(${user.id})${user.name} `;
            selectElement.appendChild(option);
        }
    });

    // 添加选择事件监听
    selectElement.addEventListener('change', function () {
        const userId = this.value;
        const studentInfoDiv = document.getElementById('studentInfo');
        const studentNameInfo = document.getElementById('studentNameInfo');
        const studentIdInfo = document.getElementById('studentIdInfo');
        // const studentDeptInfo = document.getElementById('studentDeptInfo');
        const studentRoleInfo = document.getElementById('studentRoleInfo');

        if (userId && window.appData.users[userId]) {
            const user = window.appData.users[userId];
            studentNameInfo.textContent = user.name || '-';
            studentIdInfo.textContent = user.id || '-';
            // studentDeptInfo.textContent = user.department || '-';
            // "role": ["admin", "teacher" ,"student"] 映射转换为["管理员","教师","考生"] 
            const roleMap = {
                "admin": "管理员",
                "teacher": "教师",
                "student": "考生"
            };
            studentRoleInfo.textContent = roleMap[user.role] || '-';
            studentInfoDiv.style.display = 'block';
        } else {
            studentInfoDiv.style.display = 'none';
        }
    });
}

/**
 * 删除指定考生的指定考试数据
 * @param {string} dataType - 数据类型 ('answers' 或 'results')
 * @param {string} examId - 考试ID
 * @param {string} userId - 考生ID
 */
async function deleteExamData(dataType, examId, userId) {
    let data = [];
    let fileName = '';
    let message = '';

    if (dataType === 'answers') {
        data = window.appData.answers || [];
        // 从服务器获取最新的答案数据
        // try {
        //     const response = await fetch('/api/get-answers');
        //     if (!response.ok) throw new Error('服务器响应异常');
        //     data = await response.json() || [];
        //     // 更新本地缓存
        //     window.appData.answers = data;
        // } catch (error) {
        //     console.error('获取答案数据失败:', error);
        //     // 失败时使用本地缓存
        //     data = window.appData.answers || [];
        //     showActionMessage('获取最新数据失败，使用本地缓存', true);
        // }
        fileName = 'answers.json';
        message = '删除答题数据';
        // 过滤掉指定考生的指定考试数据
        // console.log(data);
        // console.log(examId, userId);
        const examData = data.find(item => item.examId.toString() === examId.toString());
        // console.log(examData);
        const filteredData = examData.submissions.filter(item => !(item.userId.toString() === userId.toString()));
        // console.log(filteredData);
        examData.submissions = filteredData;
        // console.log(data);
        saveToFile('/api/save-answers', data);
    } else if (dataType === 'results') {
        data = window.appData.results || [];
        // 从服务器获取最新的结果数据
        // try {
        //     const response = await fetch('/api/get-results');
        //     if (!response.ok) throw new Error('服务器响应异常');
        //     data = await response.json() || [];
        //     // 更新本地缓存
        //     window.appData.results = data;
        // } catch (error) {
        //     console.error('获取结果数据失败:', error);
        //     // 失败时使用本地缓存
        //     data = window.appData.results || [];
        //     showActionMessage('获取最新数据失败，使用本地缓存', true);
        // }
        fileName = 'results.json';
        message = '删除考试结果数据';
        // 过滤掉指定考生的指定考试数据
        // console.log(data);
        const filteredData = data.filter(item => !(item.examId.toString() === examId.toString() && item.userId.toString() === userId.toString()));
        // console.log(filteredData);
        saveToFile('/api/save-results', filteredData);        
    }
}

/**
 * 初始化开关状态
 */
function initToggles() {
    // 仅显示主观题开关
    const onlyShortAnswerToggle = document.getElementById('onlyShortAnswerToggle');
    if (onlyShortAnswerToggle) {
        // 从localStorage加载保存的设置
        const savedState = localStorage.getItem('onlyShortAnswer');
        if (savedState !== null) {
            onlyShortAnswerToggle.checked = savedState === 'true';
        }

        // 保存开关状态到localStorage
        onlyShortAnswerToggle.addEventListener('change', () => {
            localStorage.setItem('onlyShortAnswer', onlyShortAnswerToggle.checked);
            // showActionMessage('阅卷设置已更新', false);
        });
    }

    // 考试状态自动更新开关
    const autoUpdateExamStatusToggle = document.getElementById('autoUpdateExamStatusToggle');
    if (autoUpdateExamStatusToggle) {
        // 从localStorage加载保存的设置
        const savedState = localStorage.getItem('autoUpdateExamStatus');
        if (savedState !== null) {
            autoUpdateExamStatusToggle.checked = savedState === 'true';
        }

        // 保存开关状态并响应变化
        autoUpdateExamStatusToggle.addEventListener('change', () => {
            Config.toggleAutoUpdate(autoUpdateExamStatusToggle.checked);
            showActionMessage(autoUpdateExamStatusToggle.checked ? '考试状态自动更新已启用' : '考试状态自动更新已禁用', false);
        });
    }

    // 试卷导出包含答案开关
    const includeAnswersInExportToggle = document.getElementById('includeAnswersInExportToggle');
    if (includeAnswersInExportToggle) {
        // 从localStorage加载保存的设置
        const savedState = localStorage.getItem('includeAnswersInExport');
        if (savedState !== null) {
            includeAnswersInExportToggle.checked = savedState === 'true';
        } else {
            // 默认不包含答案
            includeAnswersInExportToggle.checked = false;
            localStorage.setItem('includeAnswersInExport', 'false');
        }

        // 保存开关状态到localStorage
        includeAnswersInExportToggle.addEventListener('change', () => {
            localStorage.setItem('includeAnswersInExport', includeAnswersInExportToggle.checked);
            showActionMessage(includeAnswersInExportToggle.checked ? '试卷导出包含答案已启用' : '试卷导出包含答案已禁用', false);
        });
    }

    // 练习模式开关
    const practiceModeToggle = document.getElementById('practiceModeToggle');
    if (practiceModeToggle) {
        // 从localStorage加载保存的设置
        const savedState = localStorage.getItem('practiceMode');
        if (savedState !== null) {
            practiceModeToggle.checked = savedState === 'true';
        } else {
            // 默认禁用练习模式
            practiceModeToggle.checked = false;
            localStorage.setItem('practiceMode', 'false');
        }

        // 保存开关状态到localStorage并触发事件
        practiceModeToggle.addEventListener('change', () => {
            const isPracticeMode = practiceModeToggle.checked;
            localStorage.setItem('practiceMode', isPracticeMode);
            showActionMessage(isPracticeMode ? '练习模式已启用' : '练习模式已禁用', false);

            // 创建并分发自定义事件
            const practiceModeChangeEvent = new CustomEvent('practiceModeChanged', {
                detail: { isPracticeMode: isPracticeMode }
            });
            document.dispatchEvent(practiceModeChangeEvent);
        });
    }

    // 允许考生查看答案开关
    const allowStudentsViewAnswersToggle = document.getElementById('allowStudentsViewAnswersToggle');
    if (allowStudentsViewAnswersToggle) {
        // 从localStorage加载保存的设置
        const savedState = localStorage.getItem('allowStudentsViewAnswers');
        if (savedState !== null) {
            allowStudentsViewAnswersToggle.checked = savedState === 'true';
        } else {
            // 默认不允许考生查看答案
            allowStudentsViewAnswersToggle.checked = false;
            localStorage.setItem('allowStudentsViewAnswers', 'false');
        }

        // 设置window.isAllowStudentsViewAnswers的值
        window.isAllowStudentsViewAnswers = allowStudentsViewAnswersToggle.checked;

        // 保存开关状态到localStorage并更新window变量
        allowStudentsViewAnswersToggle.addEventListener('change', () => {
            const isEnabled = allowStudentsViewAnswersToggle.checked;
            localStorage.setItem('allowStudentsViewAnswers', isEnabled);
            window.isAllowStudentsViewAnswers = isEnabled;
            showActionMessage(isEnabled ? '允许考生查看答案已启用' : '允许考生查看答案已禁用', false);
        });
    } else {
        // 如果开关不存在，默认设置为false
        window.isAllowStudentsViewAnswers = false;
    }
}

// 自动更新考试状态配置
let autoUpdateExamStatus = false;
let updateInterval = null;
const UPDATE_INTERVAL_MS = 60000; // 默认1分钟更新一次

// 初始化自动更新设置
function initAutoUpdateSettings() {
    // 从localStorage加载保存的设置
    const savedState = localStorage.getItem('autoUpdateExamStatus');
    if (savedState !== null) {
        autoUpdateExamStatus = savedState === 'true';
    }

    // 如果启用了自动更新，则启动定时器
    if (autoUpdateExamStatus) {
        startAutoUpdate();
    }
}

// 启动自动更新定时器
function startAutoUpdate() {
    if (updateInterval) clearInterval(updateInterval);

    updateInterval = setInterval(() => {
        console.log('自动更新考试状态...');
        // 这里将调用examManagement.js中的更新考试状态函数
        if (window.updateAllExamStatus) {
            window.updateAllExamStatus();
        }
    }, UPDATE_INTERVAL_MS);

    // console.log('考试状态自动更新已启动，间隔:', UPDATE_INTERVAL_MS / 1000, '秒');
}

// 停止自动更新定时器
function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('考试状态自动更新已停止');
    }
}

// 切换自动更新状态
function toggleAutoUpdate(enabled) {
    autoUpdateExamStatus = enabled;
    localStorage.setItem('autoUpdateExamStatus', enabled);

    if (enabled) {
        startAutoUpdate();
    } else {
        stopAutoUpdate();
    }
}

// 导出配置相关函数供其他模块使用
export const Config = {
    isOnlyShortAnswerEnabled: () => {
        return localStorage.getItem('onlyShortAnswerEnabled') === 'true';
    },
    isAutoUpdateExamStatusEnabled: () => autoUpdateExamStatus,
    isIncludeAnswersInExportEnabled: () => {
        return localStorage.getItem('includeAnswersInExport') === 'true';
    },
    isAllowStudentsViewAnswersEnabled: () => {
        return localStorage.getItem('allowStudentsViewAnswers') === 'true';
    },
    toggleAutoUpdate
};

// 初始化自动更新设置
initAutoUpdateSettings();