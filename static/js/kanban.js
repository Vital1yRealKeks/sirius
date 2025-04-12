$(document).ready(function () {
    // Инициализация канбан-доски
    initKanbanBoard();

    function initKanbanBoard() {
        // Обработчик кнопки показа/скрытия доски
        $('#show-kanban-btn').click(function() {
            $('.list-container').hide();
            $('.kanban-container').toggle();
            
            // Обновляем активный класс кнопок
            $('#show-kanban-btn').addClass('btn-primary').removeClass('btn-secondary');
            $('#show-list-btn').addClass('btn-secondary').removeClass('btn-primary');
            
            // Если доска показывается впервые - загружаем карточки
            if ($('.kanban-container').is(':visible') && $('.kanban-card').length === 0) {
                loadCards();
            }
        });
        
        // Обработчик кнопки показа/скрытия списка задач
        $('#show-list-btn').click(function() {
            $('.kanban-container').hide();
            $('.list-container').toggle();
            
            // Обновляем активный класс кнопок
            $('#show-list-btn').addClass('btn-primary').removeClass('btn-secondary');
            $('#show-kanban-btn').addClass('btn-secondary').removeClass('btn-primary');
            
            // Если список показывается впервые - загружаем задачи
            if ($('.list-container').is(':visible') && $('.task-list-item').length === 0) {
                loadCards();
            }
        });

        // Обработчик кнопки "Добавить карточку"
        $('#add-card-btn, #add-list-task-btn').click(function (e) {
            e.stopPropagation();
            showCardModal();
        });

        // Закрытие модального окна
        $('.close-btn').click(function () {
            hideCardModal();
        });

        // Сохранение новой карточки из модального окна
        $('#save-card-btn').click(function () {
            const text = $('#card-text-input').val().trim();
            if (!text) {
                alert('Введите текст карточки');
                return;
            }

            $.ajax({
                url: '/api/kanban/cards',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    text: text,
                    column: 'To Do'
                }),
                success: function (response) {
                    if (!response || !response.id) {
                        throw new Error('Invalid server response');
                    }
                    addCardToDOM(response);
                    hideCardModal();
                },
                error: function (xhr) {
                    showAjaxError(xhr, 'добавлении карточки');
                }
            });
        });
    }

    // Модальное окно: показать
    function showCardModal() {
        $('#card-modal').fadeIn();
        $('#card-text-input').val('').focus();
    }

    // Модальное окно: скрыть
    function hideCardModal() {
        $('#card-modal').fadeOut();
    }

    // Загрузка всех карточек
    function loadCards() {
        $.get('/api/kanban/cards')
            .done(function (data) {
                if (!data || !Array.isArray(data.cards)) {
                    throw new Error('Invalid data format');
                }

                // Очищаем контейнеры карточек и списка задач
                $('.cards-container').empty();
                $('.task-list-items').empty();
                
                // Добавляем карточки в DOM
                data.cards.forEach(card => {
                    addCardToDOM(card);
                    addCardToListView(card);
                });
                
                initSortable(); // Инициализируем после добавления
            })
            .fail(function (xhr) {
                showAjaxError(xhr, 'загрузке карточек');
            });
    }

    // Добавление карточки в DOM (канбан-доска)
    function addCardToDOM(card) {
        const cardHtml = `
            <div class="kanban-card" data-card-id="${card.id}">
                <div class="card-text">${card.text}</div>
                <div class="card-actions">
                    <button class="btn-delete">×</button>
                </div>
            </div>
        `;

        $(`[data-column="${card.column}"] .cards-container`).append(cardHtml);
        $(`.kanban-card[data-card-id="${card.id}"] .btn-delete`).click(deleteCardHandler);
    }
    
    // Добавление карточки в представление списка
    function addCardToListView(card) {
        const listItemHtml = `
            <div class="task-list-item" data-card-id="${card.id}">
                <div class="task-text">${card.text}</div>
                <div class="task-actions">
                    <span class="task-column">${card.column}</span>
                    <button class="btn-move" data-card-id="${card.id}">↔</button>
                    <button class="btn-delete" data-card-id="${card.id}">×</button>
                </div>
            </div>
        `;

        $(`[data-column="${card.column}"] .task-list-items`).append(listItemHtml);
        
        // Добавляем обработчики событий
        $(`.task-list-item[data-card-id="${card.id}"] .btn-delete`).click(deleteCardHandler);
        $(`.task-list-item[data-card-id="${card.id}"] .btn-move`).click(showMoveCardDialog);
    }
    
    // Показать диалог перемещения карточки
    function showMoveCardDialog() {
        const cardId = $(this).data('card-id');
        const currentColumn = $(this).closest('.task-list-column').data('column');
        
        // Создаем список доступных колонок для перемещения
        const columns = ['To Do', 'In Progress', 'Done'];
        let moveOptions = '';
        
        columns.forEach(column => {
            if (column !== currentColumn) {
                moveOptions += `<button class="move-to-column" data-target="${column}" data-card-id="${cardId}">${column}</button>`;
            }
        });
        
        // Показываем диалог с опциями
        const moveDialog = $(`
            <div class="move-dialog">
                <div class="move-dialog-content">
                    <h4>Переместить в:</h4>
                    ${moveOptions}
                    <button class="cancel-move">Отмена</button>
                </div>
            </div>
        `);
        
        $('body').append(moveDialog);
        
        // Обработчики для кнопок перемещения
        $('.move-to-column').click(function() {
            const targetColumn = $(this).data('target');
            const cardId = $(this).data('card-id');
            updateCardPosition(cardId, targetColumn);
            $('.move-dialog').remove();
        });
        
        // Обработчик для кнопки отмены
        $('.cancel-move').click(function() {
            $('.move-dialog').remove();
        });
    }

    // Удаление карточки
    function deleteCardHandler() {
        const cardId = $(this).closest('.kanban-card, .task-list-item').data('card-id');
        deleteCard(cardId);
    }

    function deleteCard(cardId) {
        if (confirm('Удалить эту карточку?')) {
            $.ajax({
                url: '/api/kanban/cards/' + cardId,
                type: 'DELETE',
                success: function () {
                    $(`.kanban-card[data-card-id="${cardId}"]`).remove();
                    $(`.task-list-item[data-card-id="${cardId}"]`).remove();
                },
                error: function (xhr) {
                    showAjaxError(xhr, 'удалении карточки');
                }
            });
        }
    }

    // Обработка перетаскивания карточек
    function initSortable() {
        $('.cards-container').each(function () {
            new Sortable(this, {
                group: 'kanban',
                animation: 150,
                draggable: '.kanban-card',
                onEnd: function (evt) {
                    const cardId = evt.item.dataset.cardId;
                    const newColumn = evt.to.closest('.kanban-column').dataset.column;
                    updateCardPosition(cardId, newColumn);
                }
            });
        });
    }

    // Обновление позиции карточки (колонки)
    function updateCardPosition(cardId, newColumn) {
        $.ajax({
            url: '/api/kanban/cards/' + cardId + '/move',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ column: newColumn }),
            success: function() {
                // Обновляем представление списка
                const taskItem = $(`.task-list-item[data-card-id="${cardId}"]`);
                if (taskItem.length) {
                    // Обновляем метку колонки
                    taskItem.find('.task-column').text(newColumn);
                    
                    // Перемещаем элемент в соответствующую колонку в списке
                    taskItem.detach().appendTo(`.task-list-column[data-column="${newColumn}"] .task-list-items`);
                }
            },
            error: function (xhr) {
                showAjaxError(xhr, 'перемещении карточки');
                loadCards(); // восстановление в случае ошибки
            }
        });
    }

    // Вывод ошибки
    function showAjaxError(xhr, action) {
        const errorMessage = xhr.responseJSON?.error || xhr.statusText || 'Неизвестная ошибка';
        console.error(`Ошибка при ${action}:`, errorMessage);
        alert(`Ошибка при ${action}: ${errorMessage}`);
    }
    
    // Добавляем стили для диалога перемещения
    $('<style>')
        .text(`
            .move-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1100;
            }
            .move-dialog-content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                min-width: 200px;
            }
            .move-dialog-content h4 {
                margin-top: 0;
                margin-bottom: 10px;
            }
            .move-dialog-content button {
                padding: 8px;
                cursor: pointer;
                border: none;
                border-radius: 4px;
            }
            .move-to-column {
                background: #007bff;
                color: white;
            }
            .cancel-move {
                background: #f5f5f5;
                margin-top: 10px;
            }
        `)
        .appendTo('head');
});
