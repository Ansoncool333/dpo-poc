// API 配置
const API_BASE_URL = 'https://your-api-gateway-url.com'; // 替换为实际的API网关地址

// DOM 元素
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const fileList = document.getElementById('fileList');
const refreshBtn = document.getElementById('refreshBtn');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

// 全局变量
let selectedFiles = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    loadFileList();
});

// 初始化事件监听器
function initEventListeners() {
    // 文件选择
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // 上传按钮
    uploadBtn.addEventListener('click', handleUpload);
    
    // 刷新按钮
    refreshBtn.addEventListener('click', loadFileList);
    
    // 消息提示关闭
    toastClose.addEventListener('click', hideToast);
}

// 处理文件选择
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    updateSelectedFiles(files);
}

// 处理拖拽悬停
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

// 处理拖拽离开
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

// 处理文件拖拽
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    updateSelectedFiles(files);
}

// 更新选中的文件
function updateSelectedFiles(files) {
    selectedFiles = files;
    
    if (files.length > 0) {
        uploadBtn.disabled = false;
        const fileNames = files.map(f => f.name).join(', ');
        document.querySelector('.upload-text').textContent = `已选择 ${files.length} 个文件`;
        document.querySelector('.upload-hint').textContent = fileNames;
    } else {
        uploadBtn.disabled = true;
        document.querySelector('.upload-text').textContent = '点击选择文件或拖拽文件到此处';
        document.querySelector('.upload-hint').textContent = '支持图片、文档、视频等多种格式';
    }
}

// 处理文件上传
async function handleUpload() {
    if (selectedFiles.length === 0) {
        showToast('请先选择文件', 'error');
        return;
    }
    
    uploadBtn.disabled = true;
    uploadProgress.style.display = 'block';
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progress = ((i + 1) / selectedFiles.length) * 100;
            
            updateProgress(progress, `正在上传 ${file.name}...`);
            
            await uploadFile(file);
        }
        
        showToast('所有文件上传成功！', 'success');
        resetUploadForm();
        loadFileList();
        
    } catch (error) {
        console.error('上传失败:', error);
        showToast('上传失败: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadProgress.style.display = 'none';
    }
}

// 上传单个文件
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
    }
    
    return await response.json();
}

// 更新进度条
function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressText.textContent = Math.round(percent) + '%';
    
    if (text) {
        progressText.textContent = text + ' (' + Math.round(percent) + '%)';
    }
}

// 重置上传表单
function resetUploadForm() {
    selectedFiles = [];
    fileInput.value = '';
    uploadBtn.disabled = true;
    document.querySelector('.upload-text').textContent = '点击选择文件或拖拽文件到此处';
    document.querySelector('.upload-hint').textContent = '支持图片、文档、视频等多种格式';
    updateProgress(0);
}

// 加载文件列表
async function loadFileList() {
    loading.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE_URL}/files`);
        
        if (!response.ok) {
            throw new Error('获取文件列表失败');
        }
        
        const data = await response.json();
        renderFileList(data.files || []);
        
    } catch (error) {
        console.error('加载文件列表失败:', error);
        showToast('加载文件列表失败: ' + error.message, 'error');
        renderFileList([]);
    } finally {
        loading.style.display = 'none';
    }
}

// 渲染文件列表
function renderFileList(files) {
    if (files.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <div class="empty-state-text">暂无文件</div>
                <div class="empty-state-hint">上传一些文件来开始使用吧</div>
            </div>
        `;
        return;
    }
    
    const fileItems = files.map(file => createFileItem(file)).join('');
    fileList.innerHTML = fileItems;
}

// 创建文件项
function createFileItem(file) {
    const fileIcon = getFileIcon(file.name);
    const fileSize = formatFileSize(file.size);
    const uploadTime = formatDate(file.lastModified || file.uploadTime);
    
    return `
        <div class="file-item">
            <div class="file-icon">${fileIcon}</div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">${fileSize} • ${uploadTime}</div>
            </div>
            <div class="file-actions">
                <button class="btn btn-success" onclick="downloadFile('${file.key || file.name}', '${file.name}')">
                    下载
                </button>
                <button class="btn btn-danger" onclick="deleteFile('${file.key || file.name}', '${file.name}')">
                    删除
                </button>
            </div>
        </div>
    `;
}

// 获取文件图标
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
        // 图片
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'svg': '🖼️',
        // 文档
        'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄', 'rtf': '📄',
        // 表格
        'xls': '📊', 'xlsx': '📊', 'csv': '📊',
        // 演示文稿
        'ppt': '📊', 'pptx': '📊',
        // 压缩文件
        'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'tar': '🗜️', 'gz': '🗜️',
        // 视频
        'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'wmv': '🎬', 'flv': '🎬', 'mkv': '🎬',
        // 音频
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵',
        // 代码
        'js': '💻', 'html': '💻', 'css': '💻', 'py': '💻', 'java': '💻', 'cpp': '💻', 'c': '💻'
    };
    
    return iconMap[ext] || '📄';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 如果是今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 如果是今年
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
    
    // 其他情况显示完整日期
    return date.toLocaleDateString('zh-CN');
}

// 下载文件
async function downloadFile(fileKey, fileName) {
    try {
        showToast('正在准备下载...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/download?key=${encodeURIComponent(fileKey)}`);
        
        if (!response.ok) {
            throw new Error('下载失败');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('下载成功！', 'success');
        
    } catch (error) {
        console.error('下载失败:', error);
        showToast('下载失败: ' + error.message, 'error');
    }
}

// 删除文件
async function deleteFile(fileKey, fileName) {
    if (!confirm(`确定要删除文件 "${fileName}" 吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: fileKey })
        });
        
        if (!response.ok) {
            throw new Error('删除失败');
        }
        
        showToast('文件删除成功！', 'success');
        loadFileList();
        
    } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败: ' + error.message, 'error');
    }
}

// 显示消息提示
function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(hideToast, 3000);
}

// 隐藏消息提示
function hideToast() {
    toast.classList.remove('show');
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 工具函数：节流
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}