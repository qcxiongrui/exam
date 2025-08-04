import { showActionMessage } from '../utils/format.js';
import { sortResultsByTotalScoreDesc } from '../utils/helpers.js';
import { saveToFile } from '../utils/helpers.js';

window.results = [];
// 加载答案数据并渲染成绩表格
//data: [5, 12, 28, 45, 36]
export function renderScoreChart() {
    // 获取成绩数据
    // const scores = window.appData.results.map(item => item.totalScore);
    // const labels = window.appData.results.map(item => item.userName);

    // // 渲染图表
    // const ctx = document.getElementById('scoreChart').getContext('2d');
    // new Chart(ctx, {
    //     type: 'bar',
    //     data: {
    //         labels: labels,
    //         datasets: [{ label: '考试成绩', data: scores, backgroundColor: 'rgba(39, 174, 96, 0.6)' }]
    //     }
    // });

    // 添加保护机制
    if (typeof Chart === 'undefined') {
        console.error('Chart.js 未加载，图表功能不可用');
        return;
    }

    // 销毁现有图表实例
    if (window._charts?.scoreChart) {
        window._charts.scoreChart.destroy();
    }

    // 确保_charts对象存在
    window._charts = window._charts || {};

    const ctx = document.getElementById('scoreChart').getContext('2d');

    // 模拟成绩分布数据
    // 从appData获取考试结果并统计各分数段人数
    const results = window.appData?.results || [];
    const scoreRanges = ['0-59', '60-69', '70-79', '80-89', '90-100'].map(label => {
        const [min, max] = label.split('-').map(Number);
        return { min, max };
    });

    // 统计每个分数段的人数
    const scoreCounts = scoreRanges.map(range => {
        return results.filter(result => {
            const score = result.totalScore || 0;
            return score >= range.min && score <= range.max;
        }).length;
    });

    const scoreData = {
        labels: ['0-59', '60-69', '70-79', '80-89', '90-100'],
        datasets: [{
            label: '人数分布',
            data: scoreCounts,
            backgroundColor: [
                'rgba(231, 76, 60, 0.7)',
                'rgba(241, 196, 15, 0.7)',
                'rgba(52, 152, 219, 0.7)',
                'rgba(46, 204, 113, 0.7)',
                'rgba(155, 89, 182, 0.7)'
            ],
            borderColor: [
                'rgba(231, 76, 60, 1)',
                'rgba(241, 196, 15, 1)',
                'rgba(52, 152, 219, 1)',
                'rgba(46, 204, 113, 1)',
                'rgba(155, 89, 182, 1)'
            ],
            borderWidth: 1
        }]
    };

    window._charts['scoreChart'] = new Chart(ctx, {
        type: 'bar',
        data: scoreData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '人数'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '分数段'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '考试成绩分布图',
                    font: {
                        size: 18
                    }
                }
            }
        }
    });
}

export function renderResultsTable() {  // loadAndRenderResults()
    const container = document.getElementById('resultsTable');
    container.innerHTML = '';

    // console.log(window.appData?.results);
    if (window.appData && window.appData.results && Array.isArray(window.appData.results)) {
        const totalParticipants = window.appData.results.length;
        const passedCount = window.appData.results.filter(item => item.examStatus === "通过").length;
        const pendingGrading = window.appData.results.filter(item => item.gradingStatus === "待批改").length;
        const passRate = totalParticipants > 0 ? parseFloat((passedCount / totalParticipants * 100).toFixed(1)) : 0;
        results = [totalParticipants, passRate, pendingGrading];
    } else {
        results = [0, 0, 0]; // 默认值
        showActionMessage('成绩数据加载失败，请刷新页面重试', true);
        return;
    }
    // if (!window.appData || !window.appData.results || !Array.isArray(window.appData.results)) {
    //     showActionMessage('成绩数据加载失败，请刷新页面重试', true);
    //     return;
    // }
    // 检查结果数据是否存在并排序
    if (!window.appData || !window.appData.results) {
        console.error('错误: 考试结果数据未加载');
        return;
    }
    //  console.log(window.appData.results);
    const sortedResults = sortResultsByTotalScoreDesc(window.appData.results);
    //  console.log(sortedResults);
    // saveToFile('/api/save-results', sortedResults);
    sortedResults.forEach(item => {
        const row = `
                            <tr>
                                <td>${item.rank}</td>
                                <td>${item.userName}</td>
                                <td>${item.userId}</td>
                                <td>${item.examName}</td>
                                <td><strong>${item.totalScore}</strong></td>
                                <td>${item.examTime}</td>
                                <td style="color: #27ae60;">${item.examStatus}</td>
                            </tr>
                    `;

        container.innerHTML += row;
    });

    // 渲染分数段统计图表
    renderScoreChart();
}

// 渲染统计卡片
// 页面加载完成后自动渲染统计卡片
// document.addEventListener('DOMContentLoaded', () => {
//     // console.log('DOMContentLoaded事件触发，准备渲染统计卡片');
//     // 这里可以从API或数据服务获取真实数据    
//     const sampleData = {
//         totalParticipants: 136,
//         passRate: 85.6,
//         pendingGrading: 32
//     };
//     // console.log('准备使用示例数据渲染:', sampleData);   //totalParticipants = 126, passRate = '85.6%', pendingGrading = 32  
//     renderStatsCards(sampleData.totalParticipants, sampleData.passRate, sampleData.pendingGrading);
// });

export function renderStatsCards(totalParticipants, passRate, pendingGrading) {
    // 获取统计容器元素并检查是否存在
    const container = document.querySelector('.stats-container');
    if (!container) {
        console.error('错误: 未找到stats-container元素');
        return;
    }

    // 设置容器内容
    container.innerHTML = `<div class="stat-card">
            <div class="stat-icon" style="background: #e1f5fe;">
                <i class="fas fa-users" style="color: #0288d1;"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value" id="examParticipants">${totalParticipants}</div>
                <div class="stat-label">参加考试人数</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #e8f5e9;">
                <i class="fas fa-check" style="color: #388e3c;"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value" id="passRate">${passRate}%</div>
                <div class="stat-label">平均通过率</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #fbe9e7;">
                <i class="fas fa-clock" style="color: #d84315;"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value" id="pendingGrading">${pendingGrading}</div>
                <div class="stat-label">待批改试卷</div>
            </div>
        </div>
    `;
    // console.log('统计卡片已成功渲染到页面');
    // console.log('渲染数据:', { totalParticipants, passRate, pendingGrading });
    // console.log('容器内容:', container.innerHTML);
}