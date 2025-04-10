# models.py
from datetime import datetime
from extensions import db
from flask_login import UserMixin


class User(db.Model, UserMixin):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(256), nullable=False)

    kanban_cards = db.relationship('KanbanCard', backref='user', lazy=True)


class KanbanCard(db.Model):
    __tablename__ = 'kanban_card'

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    column = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), default='#dddddd')
    created = db.Column(db.DateTime, default=datetime.utcnow)  # Добавьте это поле
    modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sort_order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'column': self.column,
            'color': self.color,
            'created': self.created.isoformat() if self.created else None,
            'modified': self.modified.isoformat() if self.modified else None
        }