import { showActionMessage } from '../utils/format.js';
import { previewQuestions, displayFileInfo } from './examManagement.js';

window.currentImportQuestions = [];
window.lastSelectedFilePath = '';
// 导入试题功能
export function openImportModal() {
    const fileInfo = document.getElementById('fileInfo');
    const previewContainer = document.getElementById('previewContainer');
    const importBtn = document.getElementById('importBtn');
    const importModal = document.getElementById('importModal');
    const fileInput = document.getElementById('fileInput');

    fileInfo.style.display = 'none';
    previewContainer.style.display = 'none';
    importBtn.disabled = true;
    importModal.style.display = 'flex';
    // 重置文件输入值，确保重复选择会触发change事件
    fileInput.value = '';
    // 确保只绑定一次事件
    fileInput.removeEventListener('change', handleFileSelect);
    fileInput.addEventListener('change', handleFileSelect);
}

export function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        // 直接处理文件，不进行重复检查
        processSelectedFile(file);
    }
}

// 处理选中的文件
function processSelectedFile(file) {
    displayFileInfo(file);
    // 文件解析逻辑
    const reader = new FileReader();
    reader.onload = function (e) {
        // if (true){
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 获取第一个工作表
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // 提取所有包含数据的单元格
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 1, header: 1 });
            // console.log(jsonData);

            // 提取试题
            window.currentImportQuestions = []
            jsonData.forEach(row => {
                if (row.length > 0 && row[0] && row[0].trim() !== '') {
                    switch (row[0].trim()) {
                        case '单选':
                            const singleOptions = [];
                            for (let i = 6; i < row.length; i++) {
                                if (row[i]) singleOptions.push(row[i]);
                            };
                            currentImportQuestions.push({
                                id: row[1],
                                type: "single",
                                text: row[5],
                                options: singleOptions,
                                correctAnswer: [row[2]],
                                explanation: row[3],
                                points: row[4]
                            });
                            break;
                        case '多选':
                            const multiOptions = [];
                            for (let i = 6; i < row.length; i++) {
                                if (row[i]) multiOptions.push(row[i]);
                            };
                            currentImportQuestions.push({
                                id: row[1],
                                type: "multiple",
                                text: row[5],
                                options: multiOptions,
                                correctAnswer: row[2].split(",").map(item => item.trim()),
                                explanation: row[3],
                                points: row[4]
                            });
                            break;
                        case '判断':
                            currentImportQuestions.push({
                                id: row[1],
                                type: "judge",
                                text: row[5],
                                correctAnswer: [row[2].trim()],
                                explanation: row[3],
                                points: row[4]
                            });
                            break;
                        case '填空':
                            const placeholders = [];
                            for (let i = 6; i < row.length; i++) {
                                if (row[i]) placeholders.push(row[i]);
                            }
                            // console.log(row[2]);
                            currentImportQuestions.push({
                                id: row[1],
                                type: "fill-blank",
                                text: row[5],
                                placeholders: placeholders,
                                correctAnswer: (row[2].toString().includes(",")) ? row[2].split(",").map(item => item.trim()) : [row[2].toString().trim()],
                                explanation: row[3],
                                points: row[4]
                            });
                            break;
                        case '简答':
                            currentImportQuestions.push({
                                id: row[1],
                                type: "short-answer",
                                text: row[5],
                                correctAnswer: row[6],
                                explanation: row[3],
                                points: row[4]
                            });
                            break;
                        case '分析':
                            const subQuestions = [];
                            for (let i = 6; i < row.length; i += 6) {
                                if (row[i]) {
                                    switch (row[i]) {
                                        case '单选':
                                            subQuestions.push({
                                                id: row[1] + '-' + ((i - 6) / 6 + 1),
                                                type: "single",
                                                text: row[i + 1],
                                                options: row[i + 2].split("；").map(item => item.trim()),
                                                correctAnswer: [row[i + 3]],
                                                explanation: row[i + 4],
                                                points: row[i + 5]
                                            });
                                            break;
                                        case '多选':
                                            subQuestions.push({
                                                id: row[1] + '-' + ((i - 6) / 6 + 1),
                                                type: "multiple",
                                                text: row[i + 1],
                                                options: row[i + 2].split("；").map(item => item.trim()),
                                                correctAnswer: row[i + 3].split(",").map(item => item.trim()),
                                                explanation: row[i + 4],
                                                points: row[i + 5]
                                            });
                                            break;
                                        case '判断':
                                            subQuestions.push({
                                                id: row[1] + '-' + ((i - 6) / 6 + 1),
                                                type: "judge",
                                                text: row[i + 1],
                                                correctAnswer: [row[i + 3]],
                                                explanation: row[i + 4],
                                                points: row[i + 5]
                                            });
                                            break;
                                        case '简答':
                                            subQuestions.push({
                                                id: row[1] + '-' + ((i - 6) / 6 + 1),
                                                type: "short-answer",
                                                text: row[i + 1],
                                                correctAnswer: row[i + 3],
                                                explanation: row[i + 4],
                                                points: row[i + 5]
                                            });
                                            break;
                                    }
                                }
                            };
                            currentImportQuestions.push({
                                id: row[1],
                                type: "case-analysis",
                                text: "阅读以下案例并回答问题：",  //<!-案例描述：-->
                                caseText: row[5],
                                questions: subQuestions,
                                points: row[4]
                            });
                            break;
                    }
                }
            });

            // 预览试题
            // console.log(currentImportQuestions);
            previewQuestions(currentImportQuestions);
        } catch (error) {
            console.error('解析Excel文件失败:', error);
            showActionMessage('解析Excel文件失败，请确保文件格式正确', true);
        }
    };

    // 使用readAsArrayBuffer确保在iOS上兼容
    reader.readAsArrayBuffer(file);
}

export function importQuestions() {
    showActionMessage('试题数据准备成功，再在相关考试中点击【导入】');
    // console.log(currentImportQuestions);
    closeImportModal();
}

export function closeImportModal() {
    const importModal = document.getElementById('importModal');
    importModal.style.display = 'none';
    // 保留文件输入值以便重复选择
    // 不移除事件监听，而是在openImportModal中重新绑定
}

// 拖放功能
export function setupDragAndDrop() {
    const dropArea = document.getElementById('uploadArea');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('drag-over');
    }

    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    // 拖放处理函数
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
            const fileInput = document.getElementById('fileInput');
            fileInput.files = dt.files;
            displayFileInfo(file);
            // 手动触发change事件
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    }
}