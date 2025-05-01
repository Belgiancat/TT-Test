const resizeHandle = document.getElementById('resizeHandle');
const windowElement = document.getElementById('window');
const windowBg = document.getElementById('window-bg');
const backButton = document.querySelector('.back-button');

let isDragging = false,
    isResizing = false,
    offsetX,
    offsetY;

windowElement.addEventListener('mousedown', (e) => {
    if (e.target !== resizeHandle && e.target !== backButton) {
        isDragging = true;
        offsetX = e.clientX - windowElement.offsetLeft;
        offsetY = e.clientY - windowElement.offsetTop;
    }
});

resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    offsetX = e.clientX;
    offsetY = e.clientY;
    e.stopPropagation();
});

document.addEventListener('mousemove', (e) => {
    windowBg.style.width = windowElement.style.width;
    windowBg.style.height = windowElement.style.height;

    if (isDragging && !isResizing) {
        const newLeft = `${e.clientX - offsetX}px`;
        const newTop = `${e.clientY - offsetY}px`;

        windowElement.style.left = newLeft;
        windowElement.style.top = newTop;

    } else if (isResizing) {
        windowElement.style.width = `${windowElement.offsetWidth + (e.clientX - offsetX)}px`;
        windowElement.style.height = `${windowElement.offsetHeight + (e.clientY - offsetY)}px`;
        offsetX = e.clientX;
        offsetY = e.clientY;
    }
});
document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;

    const left = windowElement.style.left;
    const top = windowElement.style.top;
    const width = windowElement.style.width || windowElement.offsetWidth + "px";
    const height = windowElement.style.height || windowElement.offsetHeight + "px";


    if (left && top && width && height) {
        const state = { left, top, width, height };
        localStorage.setItem("window-state", JSON.stringify(state));
    }
});