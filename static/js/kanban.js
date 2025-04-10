$(document).ready(function () {
    // Инициализация канбан-доски
    initKanbanBoard();

    function initKanbanBoard() {
        // Обработчик кнопки показа/скрытия доски
        $('#show-kanban-btn').click(function() {
            $('.kanban-container').toggle();
            $(this).text(function(i, text) {
                return text === "Показать канбан-доску" ? "Скрыть канбан-доску" : "Показать канбан-доску";
            });

            // Если доска показывается впервые - загружаем карточки
            if ($('.kanban-container').is(':visible') && $('.kanban-card').length === 0) {
                loadCards();
            }
        });

        // Остальной код остаётся без изменений...
        loadCards();

        $('#add-card-btn').click(function (e) {
            e.stopPropagation();
            showCardModal();
        });


        // Остальной ваш код...
        loadCards();

        // Обработчик кнопки "Добавить карточку"
        $('#add-card-btn').click(function (e) {
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

                $('.cards-container').empty();
                data.cards.forEach(card => addCardToDOM(card));
                initSortable(); // Инициализируем после добавления
            })
            .fail(function (xhr) {
                showAjaxError(xhr, 'загрузке карточек');
            });
    }

    // Добавление карточки в DOM
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

    // Удаление карточки
    function deleteCardHandler() {
        const cardId = $(this).closest('.kanban-card').data('card-id');
        deleteCard(cardId);
    }

    function deleteCard(cardId) {
        if (confirm('Удалить эту карточку?')) {
            $.ajax({
                url: '/api/kanban/cards/' + cardId,
                type: 'DELETE',
                success: function () {
                    $(`.kanban-card[data-card-id="${cardId}"]`).remove();
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
});