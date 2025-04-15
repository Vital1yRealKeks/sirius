$(document).ready(function () {
    // Инициализация досок
    initKanbanBoard();
    initTaskListView();
    // --- КАНБАН ---
    function initKanbanBoard() {
        // Кнопка показа/скрытия канбана
        $('#show-kanban-btn').click(function () {
            // Если канбан уже отображается, скрываем его
            if ($('.kanban-container').is(':visible')) {
                $('.kanban-container').hide();
                $(this).removeClass('btn-primary').addClass('btn-secondary');
            } else {
                // Иначе показываем канбан и скрываем список
                $('.kanban-container').show();
                $('.list-container').hide();

                $(this).addClass('btn-primary').removeClass('btn-secondary');
                $('#show-list-btn').addClass('btn-secondary').removeClass('btn-primary');
                if ($('.kanban-card').length === 0) {
                    loadCards();
                }
            }
        });
        // Кнопка добавления карточки
        $('#add-card-btn').click(function (e) {
            e.stopPropagation();
            showCardModal();
        });
        // Закрытие модального окна
        $('.close-btn').click(function () {
            hideCardModal();
        });
        // Сохранение новой карточки
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
                    addTaskToListView(response);
                    hideCardModal();
                },
                error: function (xhr) {
                    showAjaxError(xhr, 'добавлении карточки');
                }
            });
        });
    }
    // --- СПИСОК ЗАДАЧ ---
    function initTaskListView() {
        // По умолчанию показываем список задач
        loadCards();

        $('#show-list-btn').click(function () {
            // Если список уже отображается, скрываем его
            if ($('.list-container').is(':visible')) {
                $('.list-container').hide();
                $(this).removeClass('btn-primary').addClass('btn-secondary');
            } else {
                // Иначе показываем список и скрываем канбан
                $('.list-container').show();
                $('.kanban-container').hide();

                $(this).addClass('btn-primary').removeClass('btn-secondary');
                $('#show-kanban-btn').addClass('btn-secondary').removeClass('btn-primary');
                if ($('.task-list-item').length === 0) {
                    loadCards();
                }
            }
        });
        $('#add-list-item-btn').click(function (e) {
            e.stopPropagation();
            showCardModal();
        });
    }
    // --- ОБЩИЕ ФУНКЦИИ ---
    function showCardModal() {
        $('#card-modal').fadeIn();
        $('#card-text-input').val('').focus();
    }
    function hideCardModal() {
        $('#card-modal').fadeOut();
    }
    function loadCards() {
        $.get('/api/kanban/cards')
            .done(function (data) {
                if (!data || !Array.isArray(data.cards)) {
                    throw new Error('Invalid data format');
                }
                $('.cards-container').empty();
                $('.task-list-items').empty();
                data.cards.forEach(card => {
                    addCardToDOM(card);
                    addTaskToListView(card);
                });
                initSortable();
            })
            .fail(function (xhr) {
                showAjaxError(xhr, 'загрузке карточек');
            });
    }
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
    function addTaskToListView(card) {
        const taskHtml = `
            <div class="task-list-item" data-card-id="${card.id}" data-column="${card.column}">
                <div class="task-text">${card.text}</div>
                <div class="task-actions">
                    <button class="btn-delete">×</button>
                </div>
            </div>
        `;
        $('.task-list-items').append(taskHtml);
        $(`.task-list-item[data-card-id="${card.id}"] .btn-delete`).click(deleteCardHandler);
    }
    function deleteCardHandler() {
        const cardId = $(this).closest('[data-card-id]').data('card-id');
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

        // Сделаем список задач также сортируемым
        new Sortable($('.task-list-items')[0], {
            animation: 150,
            draggable: '.task-list-item',
            onEnd: function (evt) {
                // Обновление позиции не требуется для простого списка
            }
        });
    }
    function updateCardPosition(cardId, newColumn) {
        $.ajax({
            url: '/api/kanban/cards/' + cardId + '/move',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ column: newColumn }),
            success: function () {
                const taskItem = $(`.task-list-item[data-card-id="${cardId}"]`);
                if (taskItem.length) {
                    taskItem.attr('data-column', newColumn);
                }
            },
            error: function (xhr) {
                showAjaxError(xhr, 'перемещении карточки');
                loadCards();
            }
        });
    }
    function showAjaxError(xhr, action) {
        const errorMessage = xhr.responseJSON?.error || xhr.statusText || 'Неизвестная ошибка';
        console.error(`Ошибка при ${action}:`, errorMessage);
        alert(`Ошибка при ${action}: ${errorMessage}`);
    }
});