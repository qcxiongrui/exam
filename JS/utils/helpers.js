// 通用工具函数
function showActionMessage(message, isError = false) {
    const messageEl = document.getElementById('actionMessage');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = 'action-message' + (isError ? ' error' : ' success');
    messageEl.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

/**
 * 对考试结果按totalScore升序排序并更新rank
 * @param {Array} results - 包含考试结果的数组
 * @returns {Array} 排序并更新rank后的结果数组
 */
export function sortResultsByTotalScoreDesc(results) {//sortResultsByTotalScoreAsc
    // 检查输入是否有效
    if (!Array.isArray(results)) {
        console.error('排序失败: 输入不是数组');
        return [];
    }

    // 创建数组深拷贝并按totalScore降序排序
    const sortedResults = [...results].map(result => JSON.parse(JSON.stringify(result))).sort((a, b) => {
        const scoreA = a.totalScore !== undefined ? a.totalScore : 0;
        const scoreB = b.totalScore !== undefined ? b.totalScore : 0;

        // 按总分数从高到低排序
        return scoreB - scoreA;
    });

    // 更新排序后的rank值
    sortedResults.forEach((result, index) => {
        result.rank = index + 1; // rank从1开始计数        
    });

    return sortedResults;
}

/**
 * 固定加密密钥
 */
export const ENCRYPTION_KEY = 'employee_exam_system_2025';

/**
 * 加密数据
 * @param {string} data - 要加密的数据
 * @param {string} key - 加密密钥
 * @returns {string} 加密后的字符串
 */
export function encryptData(data, key) {
    // 使用AES加密实现
    try {
        // 检查参数是否有效
        if (!data || !key) {
            console.error('加密失败: 参数无效');
            showActionMessage('加密失败: 参数无效', true);
            return null;
        }
        
        // 创建密钥的哈希
        const keyHash = CryptoJS.MD5(key).toString();
        // 加密数据
        const encrypted = CryptoJS.AES.encrypt(data, keyHash).toString();
        return encrypted;
    } catch (error) {
        console.error('加密失败:', error);
        showActionMessage('数据加密失败', true);
        return null;
    }
}

/**
 * 解密数据
 * @param {string} encryptedData - 要解密的数据
 * @param {string} key - 解密密钥
 * @returns {string} 解密后的字符串
 */
export function decryptData(encryptedData, key) {
    try {
        // 检查参数是否有效
        if (!encryptedData || !key) {
            console.error('解密失败: 参数无效');
            showActionMessage('解密失败: 参数无效', true);
            return null;
        }
        
        // 创建密钥的哈希
        const keyHash = CryptoJS.MD5(key).toString();
        // 解密数据
        const decrypted = CryptoJS.AES.decrypt(encryptedData, keyHash).toString(CryptoJS.enc.Utf8);
        return decrypted;
    } catch (error) {
        console.error('解密失败:', error);
        showActionMessage('数据解密失败', true);
        return null;
    }
}

/**
 * 测试加密解密功能
 * @param {string} testData - 测试数据
 * @param {string} testKey - 测试密钥
 */
export function testEncryption(testData = 'testPassword123', testKey = 'secretKey') {
    console.log('原始数据:', testData);
    
    const encrypted = encryptData(testData, testKey);
    console.log('加密后:', encrypted);
    
    const decrypted = decryptData(encrypted, testKey);
    console.log('解密后:', decrypted);
    
    if (decrypted === testData) {
        showActionMessage('加密解密功能测试成功', false);
    } else {
        showActionMessage('加密解密功能测试失败', true);
    }
}

// 保存考试数据到文件
export function saveToFile(path, dataJson) {
    if (!dataJson) {
        // showErrorMessage('没有可保存的考试数据');
        showActionMessage('没有可保存的考试数据', true);
        return;
    }

    try {
        // 将数据转换为JSON字符串
        const Data = JSON.stringify(dataJson, null, 2);
        // console.log(Data);
        // console.log(path);

        // 使用fetch API将数据发送到服务器保存
        fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: Data
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // showActionMessage('数据已成功保存');
                } else {
                    showActionMessage('保存失败: ' + (data.message || '未知错误'), true);
                }
            })
            .catch(error => {
                showActionMessage('保存数据时出错: ' + error.message, true);
                console.error('保存数据错误:', error);
            });
    } catch (error) {
        showActionMessage('处理数据时出错: ' + error.message, true);
        console.error('数据处理错误:', error);
    }
}