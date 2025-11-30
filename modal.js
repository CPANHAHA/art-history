// ========================================== 
// 自定义弹窗工具 (Web3 Style Modal) 
// ========================================== 

let modalOverlay, modalTitle, modalMessage, confirmBtn, cancelBtn;
let currentConfirmCallback = null;

function initModal() {
    if (modalOverlay) return; 
    modalOverlay = document.getElementById('customModal');
    modalTitle = document.getElementById('modalTitle');
    modalMessage = document.getElementById('modalMessage');
    confirmBtn = document.getElementById('modalConfirmBtn');
    cancelBtn = document.getElementById('modalCancelBtn');

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (currentConfirmCallback) {
                // Support async callbacks and validation
                const result = await currentConfirmCallback();
                if (result === false) return; 
            }
            closeModal();
        };
    }
    if (cancelBtn) {
        cancelBtn.onclick = () => closeModal();
    }
    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeModal();
        };
    }
}

/** 
 * 显示自定义弹窗 
 * @param {string} title - 标题 
 * @param {string} message - 内容 (支持HTML)
 * @param {function} onConfirm - 点击确定后的回调函数 
 */ 
function showModal(title, message, onConfirm = null) { 
    initModal();
    if (!modalOverlay) {
        console.warn('Modal HTML not found');
        return; 
    }

    modalTitle.innerText = title; 
    modalMessage.innerHTML = message; 

    if (onConfirm) { 
        cancelBtn.style.display = 'inline-block'; 
        currentConfirmCallback = onConfirm; 
        confirmBtn.innerText = '确定'; 
        confirmBtn.className = 'modal-btn btn-confirm'; 
    } else { 
        cancelBtn.style.display = 'none'; 
        currentConfirmCallback = null; 
        confirmBtn.innerText = '知道了'; 
    } 

    modalOverlay.classList.add('active'); 
} 

/** 
 * 关闭弹窗 
 */ 
function closeModal() { 
    if (modalOverlay) modalOverlay.classList.remove('active'); 
    currentConfirmCallback = null; 
}

// Export for module usage if needed, or just global
window.showModal = showModal;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', initModal);
