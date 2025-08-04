// 测试加密解密功能
import { encryptData, decryptData, ENCRYPTION_KEY, testEncryption, saveToFile } from './utils/helpers.js';
import { showActionMessage } from './utils/helpers.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 添加测试按钮点击事件
    const testBtn = document.getElementById('testEncryptionBtn');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            runEncryptionTests();
        });
    }

    function runEncryptionTests() {
    console.log('测试加密解密功能...');
    console.log('使用的加密密钥:', ENCRYPTION_KEY);

    // 测试1: 使用默认参数
    testEncryption();

    // 测试2: 使用自定义参数
    const customData = 'CustomPassword@123';
    const customKey = 'customSecretKey';
    testEncryption(customData, customKey);

    // 测试3: 测试Excel导入时的密码加密
    const testUser = {
        id: 'test001',
        name: '测试用户',
        password: 'TestPassword123'
    };

    console.log('原始用户数据:', testUser);
    const encryptedPassword = encryptData(testUser.password, ENCRYPTION_KEY);
    console.log('加密后的密码:', encryptedPassword);

    const decryptedPassword = decryptData(encryptedPassword, ENCRYPTION_KEY);
    console.log('解密后的密码:', decryptedPassword);

    if (decryptedPassword === testUser.password) {
        console.log('密码加密解密测试通过');
    } else {
        console.error('密码加密解密测试失败');
    }
});