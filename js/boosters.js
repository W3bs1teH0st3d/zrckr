document.addEventListener('DOMContentLoaded', function() {
    const ticker = document.getElementById('ticker');
    const container = document.querySelector('.boosters-container');
    let speed = 1; // Скорость прокрутки (пиксели за кадр)

    // Клонируем содержимое для бесконечной прокрутки
    const originalContent = ticker.innerHTML;
    ticker.innerHTML += originalContent; // Дублируем карточки

    // Вычисляем ширину оригинального контента
    const tickerWidth = ticker.scrollWidth / 2; // Половина, т.к. дублировали
    const containerWidth = container.offsetWidth;

    // Начинаем с позиции, которая центрирует контент и сразу движется влево
    let position = -tickerWidth + (containerWidth / 2);
    ticker.style.transform = `translateX(${position}px)`;

    function animateBoosters() {
        position -= speed;

        // Если контент ушёл за левый край на ширину оригинала, сбрасываем
        if (Math.abs(position) >= tickerWidth) {
            position += tickerWidth; // Сдвигаем обратно
        }

        ticker.style.transform = `translateX(${position}px)`;
        requestAnimationFrame(animateBoosters);
    }

    // Запускаем анимацию
    requestAnimationFrame(animateBoosters);

    // Остановка при наведении
    ticker.addEventListener('mouseenter', () => speed = 0);
    ticker.addEventListener('mouseleave', () => speed = 1);

    // Корректировка при ресайзе окна
    window.addEventListener('resize', () => {
        const newContainerWidth = container.offsetWidth;
        position = -tickerWidth + (newContainerWidth / 2);
        ticker.style.transform = `translateX(${position}px)`;
    });
});