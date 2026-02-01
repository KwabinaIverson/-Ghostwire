/**
 * GhostWire Alert System
 * Usage: showAlert("Message here", "error" | "success" | "info");
 * Features: auto-dismiss, pause-on-hover, click-to-dismiss, aria-live support
 */

const showAlert = (message, type = 'error') => {
    // 1. Ensure Container Exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    // 2. Define Icons based on type
    const icons = {
        error: `<svg class="w-6 h-6 text-[#ED4245]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        success: `<svg class="w-6 h-6 text-[#3BA55C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        info: `<svg class="w-6 h-6 text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    // 3. Create Toast Element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="flex-shrink-0">
            ${icons[type] || icons.info}
        </div>
        <div class="text-sm font-medium text-gray-100">
            ${message}
        </div>
    `;

    // 4. Add to DOM
    container.appendChild(toast);

    // 5. Auto-dismiss with pause-on-hover
    const DURATION = 3000;
    let remaining = DURATION;
    let start = Date.now();
    let timer = setTimeout(startRemove, remaining);

    function startRemove() {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        }, { once: true });
    }

    // Pause and resume logic
    const onMouseEnter = () => {
        clearTimeout(timer);
        const elapsed = Date.now() - start;
        remaining = Math.max(0, remaining - elapsed);
        toast.classList.add('toast-hover');
    };
    const onMouseLeave = () => {
        start = Date.now();
        timer = setTimeout(startRemove, remaining);
        toast.classList.remove('toast-hover');
    };

    toast.addEventListener('mouseenter', onMouseEnter);
    toast.addEventListener('mouseleave', onMouseLeave);

    // Click to dismiss immediately
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        startRemove();
    });

    // Accessibility: focusable and dismiss on keyboard
    toast.tabIndex = 0;
    toast.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            clearTimeout(timer);
            startRemove();
        }
    });
};