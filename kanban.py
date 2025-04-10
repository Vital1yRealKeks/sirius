from models import KanbanCard, User
from datetime import datetime
from app import db

def get_user_cards(user_id):
    """Получить все карточки пользователя"""
    return KanbanCard.query.filter_by(user_id=user_id).order_by(KanbanCard.sort_order).all()


def create_card(user_id, text, column="To Do", color="#dddddd"):
    """Создать новую карточку"""
    # Проверка, что пользователь существует
    user = User.query.get(user_id)
    if not user:
        raise ValueError("User not found")

    card = KanbanCard(text=text, column=column, color=color, user_id=user_id)
    db.session.add(card)
    db.session.commit()
    return card


def update_card(card_id, user_id, **kwargs):
    """Обновить карточку"""
    card = KanbanCard.query.filter_by(id=card_id, user_id=user_id).first()
    if not card:
        return None

    for key, value in kwargs.items():
        if hasattr(card, key):
            setattr(card, key, value)

    card.modified = datetime.utcnow()
    db.session.commit()
    return card