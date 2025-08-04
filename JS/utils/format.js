// 辅助函数
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeLocal(dateTimeStr) {
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    //const duration = (end - start) / 1000 / 60; // 分钟
    const duration = Math.round((end - start) / 60000); // 分钟

    return `${duration} 分钟`;
}

function showActionMessage(message, isError = false) {
    actionMessage.textContent = message;
    actionMessage.className = 'action-message';
    if (isError) {
        actionMessage.classList.add('error');
    }
    actionMessage.classList.add('show');

    setTimeout(() => {
        actionMessage.classList.remove('show');
    }, 3000);
}

export { formatDateTime, formatDateTimeLocal, formatDuration, showActionMessage };