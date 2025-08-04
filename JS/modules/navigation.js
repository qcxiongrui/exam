import { renderScoreChart, renderStatsCards, renderResultsTable } from './results.js';

// 缓存DOM元素
const domCache = {
    navItems: null,
    sections: null
};

export function initNavigation() {
    // 延迟加载DOM元素
    if (!domCache.navItems) {
        domCache.navItems = document.querySelectorAll('.nav-item');
    }
    if (!domCache.sections) {
        domCache.sections = document.querySelectorAll('.section');
    }

    // 使用事件委托优化事件监听
    const navContainer = document.querySelector('.nav-menu');
    if (navContainer) {
        navContainer.addEventListener('click', function (e) {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                handleNavClick(navItem);
            }
        });
    }
}

function handleNavClick(navItem) {
    const sectionId = navItem.getAttribute('data-section') + 'Section';
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
        console.warn(`未找到页面区域: ${sectionId}`);
        return;
    }

    // 更新导航激活状态
    if (domCache.navItems) {
        domCache.navItems.forEach(i => i.classList.remove('active'));
    }
    navItem.classList.add('active');

    // 更新页面显示
    if (domCache.sections) {
        domCache.sections.forEach(s => s.classList.remove('active'));
    }
    targetSection.classList.add('active');

    // 如果是成绩页面，渲染图表
    if (sectionId === 'resultsSection') {
        // 确保依赖的数据存在
        if (window.appData && window.appData.results) {
            try {
                // 获取成绩统计数据
                const totalParticipants = window.appData.results.length;
                const passedCount = window.appData.results.filter(item => item.examStatus === "通过").length;
                const pendingGrading = window.appData.results.filter(item => item.gradingStatus === "待批改").length;
                const passRate = totalParticipants > 0 ? parseFloat((passedCount / totalParticipants * 100).toFixed(1)) : 0;

                // 渲染统计卡片、图表和表格
                renderStatsCards(totalParticipants, passRate, pendingGrading);
                renderScoreChart();
                renderResultsTable();
            } catch (error) {
                console.error('渲染成绩页面失败:', error);
            }
        } else {
            console.warn('成绩数据不可用');
        }
    }
}