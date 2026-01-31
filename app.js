// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем на весь экран
tg.enableClosingConfirmation(); // Подтверждение закрытия

// Элементы DOM
const elements = {
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    taskCounter: document.getElementById('taskCounter'),
    taskInput: document.getElementById('taskInput'),
    addBtn: document.getElementById('addBtn'),
    tasksList: document.getElementById('tasksList'),
    emptyState: document.getElementById('emptyState'),
    filters: document.querySelectorAll('.filter-btn'),
    clearCompletedBtn: document.getElementById('clearCompleted'),
    saveToCloudBtn: document.getElementById('saveToCloud'),
    themeToggle: document.getElementById('themeToggle'),
    totalTasks: document.getElementById('totalTasks'),
    activeTasks: document.getElementById('activeTasks'),
    completedTasks: document.getElementById('completedTasks'),
    editModal: document.getElementById('editModal'),
    editInput: document.getElementById('editInput'),
    cancelEdit: document.getElementById('cancelEdit'),
    saveEdit: document.getElementById('saveEdit')
};

// Состояние приложения
let state = {
    tasks: JSON.parse(localStorage.getItem('telegram_tasks')) || [],
    currentFilter: 'all',
    editingTaskId: null,
    isDarkTheme: localStorage.getItem('darkTheme') === 'true'
};

// Инициализация пользователя Telegram
function initUser() {
    const user = tg.initDataUnsafe.user;
    
    if (user) {
        elements.userName.textContent = `${user.first_name}'s задачи`;
        elements.userAvatar.textContent = user.first_name.charAt(0);
        
        if (user.photo_url) {
            elements.userAvatar.style.backgroundImage = `url(${user.photo_url})`;
            elements.userAvatar.style.backgroundSize = 'cover';
        }
    }
    
    // Применяем тему
    if (state.isDarkTheme) {
        document.body.classList.add('dark-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Устанавливаем тему Telegram, если доступна
    if (tg.themeParams) {
        document.documentElement.style.setProperty('--primary-color', tg.themeParams.button_color || '#50a8eb');
    }
}

// Обновление статистики
function updateStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(task => task.completed).length;
    const active = total - completed;
    
    elements.totalTasks.textContent = total;
    elements.activeTasks.textContent = active;
    elements.completedTasks.textContent = completed;
    elements.taskCounter.textContent = `${active} активных`;
}

// Сохранение задач в localStorage
function saveTasks() {
    localStorage.setItem('telegram_tasks', JSON.stringify(state.tasks));
    updateStats();
}

// Отображение задач
function renderTasks() {
    elements.tasksList.innerHTML = '';
    
    // Фильтрация задач
    let filteredTasks = state.tasks;
    if (state.currentFilter === 'active') {
        filteredTasks = state.tasks.filter(task => !task.completed);
    } else if (state.currentFilter === 'completed') {
        filteredTasks = state.tasks.filter(task => task.completed);
    }
    
    // Показ/скрытие пустого состояния
    elements.emptyState.style.display = filteredTasks.length === 0 ? 'block' : 'none';
    
    // Создание элементов задач
    filteredTasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.className = 'task-item';
        taskItem.dataset.id = task.id;
        
        taskItem.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</span>
            <div class="task-actions">
                <button class="task-btn edit-btn" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-btn delete-btn" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        elements.tasksList.appendChild(taskItem);
        
        // Обработчики для конкретной задачи
        const checkbox = taskItem.querySelector('.task-checkbox');
        const editBtn = taskItem.querySelector('.edit-btn');
        const deleteBtn = taskItem.querySelector('.delete-btn');
        
        checkbox.addEventListener('change', () => toggleTask(task.id));
        editBtn.addEventListener('click', () => openEditModal(task.id));
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
    });
    
    updateStats();
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Добавление новой задачи
function addTask() {
    const text = elements.taskInput.value.trim();
    
    if (text === '') {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Введите текст задачи',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    state.tasks.unshift(newTask);
    elements.taskInput.value = '';
    saveTasks();
    renderTasks();
    
    // Вибрация (если доступно)
    if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
}

// Переключение статуса задачи
function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

// Удаление задачи
function deleteTask(id) {
    tg.showPopup({
        title: 'Удалить задачу?',
        message: 'Задача будет удалена безвозвратно',
        buttons: [
            { type: 'cancel', id: 'cancel' },
            { type: 'destructive', text: 'Удалить', id: 'delete' }
        ],
        callback: (btnId) => {
            if (btnId === 'delete') {
                state.tasks = state.tasks.filter(task => task.id !== id);
                saveTasks();
                renderTasks();
            }
        }
    });
}

// Открытие модального окна редактирования
function openEditModal(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        state.editingTaskId = id;
        elements.editInput.value = task.text;
        elements.editModal.style.display = 'flex';
        elements.editInput.focus();
    }
}

// Сохранение изменений
function saveEditedTask() {
    const text = elements.editInput.value.trim();
    
    if (text === '') {
        tg.showAlert('Текст не может быть пустым');
        return;
    }
    
    const task = state.tasks.find(t => t.id === state.editingTaskId);
    if (task) {
        task.text = text;
        saveTasks();
        renderTasks();
        closeEditModal();
    }
}

// Закрытие модального окна
function closeEditModal() {
    elements.editModal.style.display = 'none';
    state.editingTaskId = null;
}

// Очистка выполненных задач
function clearCompleted() {
    const completedCount = state.tasks.filter(task => task.completed).length;
    
    if (completedCount === 0) {
        tg.showAlert('Нет выполненных задач для удаления');
        return;
    }
    
    tg.showPopup({
        title: 'Удалить выполненные?',
        message: `Будет удалено ${completedCount} задач`,
        buttons: [
            { type: 'cancel', id: 'cancel' },
            { type: 'destructive', text: 'Удалить', id: 'delete' }
        ],
        callback: (btnId) => {
            if (btnId === 'delete') {
                state.tasks = state.tasks.filter(task => !task.completed);
                saveTasks();
                renderTasks();
                tg.showAlert(`Удалено ${completedCount} задач`);
            }
        }
    });
}

// Сохранение в "облако" (в данном случае просто отправка данных в Telegram)
function saveToCloud() {
    const data = {
        action: 'save_tasks',
        tasks: state.tasks,
        timestamp: new Date().toISOString(),
        user: tg.initDataUnsafe.user
    };
    
    tg.sendData(JSON.stringify(data));
    tg.showAlert('Задачи сохранены!');
}

// Переключение темы
function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    document.body.classList.toggle('dark-theme', state.isDarkTheme);
    
    if (state.isDarkTheme) {
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    localStorage.setItem('darkTheme', state.isDarkTheme);
}

// Инициализация фильтров
function initFilters() {
    elements.filters.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
}

// Инициализация событий
function initEvents() {
    // Добавление задачи
    elements.addBtn.addEventListener('click', addTask);
    elements.taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // Очистка выполненных
    elements.clearCompletedBtn.addEventListener('click', clearCompleted);
    
    // Сохранение в облако
    elements.saveToCloudBtn.addEventListener('click', saveToCloud);
    
    // Переключение темы
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Модальное окно редактирования
    elements.cancelEdit.addEventListener('click', closeEditModal);
    elements.saveEdit.addEventListener('click', saveEditedTask);
    elements.editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEditedTask();
    });
    
    // Закрытие модального окна по клику вне его
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) {
            closeEditModal();
        }
    });
    
    // Обработчик от Telegram при закрытии
    tg.onEvent('viewportChanged', (isExpanded) => {
        if (!isExpanded) {
            saveTasks();
        }
    });
}

// Основная инициализация
function init() {
    console.log('Telegram Web App инициализирован');
    
    initUser();
    initFilters();
    initEvents();
    renderTasks();
    
    // Показываем основную кнопку в Telegram
    if (tg.MainButton) {
        tg.MainButton.setText('Список задач');
        tg.MainButton.show();
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);