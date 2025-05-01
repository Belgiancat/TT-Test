document.addEventListener('DOMContentLoaded', () => {
    const resizeHandle = document.getElementById('resizeHandle');
    const windowElement = document.getElementById('window');
    const windowBg = document.getElementById('window-bg');
    const backButton = document.querySelector('.back-button');

    let isDragging = false,
        offsetX,
        offsetY;

    windowElement.addEventListener('mousedown', (e) => {
        if (e.target !== resizeHandle && e.target !== backButton) {
            isDragging = true;
            offsetX = e.clientX - windowElement.offsetLeft;
            offsetY = e.clientY - windowElement.offsetTop;
        }
    });

    document.addEventListener('mousemove', (e) => {
        windowBg.style.width = windowElement.style.width;
        windowBg.style.height = windowElement.style.height;

        if (isDragging) {
            const newLeft = `${e.clientX - offsetX}px`;
            const newTop = `${e.clientY - offsetY}px`;

            windowElement.style.left = newLeft;
            windowElement.style.top = newTop;
        }

    });

    document.addEventListener('mouseup', () => {
        isDragging = false;

        const left = windowElement.style.left;
        const top = windowElement.style.top;
        const width = windowElement.style.width || windowElement.offsetWidth + "px";
        const height = windowElement.style.height || windowElement.offsetHeight + "px";

        if (left && top && width && height) {
            const state = { left, top, width, height };
            localStorage.setItem("window-state", JSON.stringify(state));
        }
    });
});
