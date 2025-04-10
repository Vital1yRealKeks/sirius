# app.py

from datetime import datetime
from flask import Flask, jsonify, redirect, url_for, flash, render_template, request
from flask_login import current_user, login_required, logout_user, login_user
from sqlalchemy import inspect
from sqlalchemy.testing.plugin.plugin_base import logging
from extensions import db, bcrypt, login_manager, migrate
from models import User, KanbanCard


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'mysecretkey'

    # Инициализация расширений
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    # Регистрация blueprint'ов (если есть)
    # from views import main_bp
    # app.register_blueprint(main_bp)

    return app


app = create_app()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# Конфигурация колонок
KANBAN_COLUMNS = ['To Do', 'In Progress', 'Done']

# Создание таблиц
with app.app_context():
    db.create_all()
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print("Существующие таблицы:", tables)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password1 = request.form.get('password1')
        password2 = request.form.get('password2')

        if not all([username, password1, password2]):
            flash('Заполните все поля', 'danger')
            return redirect(url_for('register'))

        if password1 != password2:
            flash('Пароли не совпадают!', 'danger')
            return redirect(url_for('register'))

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Пользователь с таким логином уже существует', 'danger')
            return redirect(url_for('register'))

        hashed_password = bcrypt.generate_password_hash(password1).decode('utf-8')
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash('Регистрация успешна! Теперь вы можете войти', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':  # Здесь должен использоваться request из Flask
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            flash('Заполните все поля', 'danger')
            return redirect(url_for('login'))

        user = User.query.filter_by(username=username).first()

        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Неверное имя пользователя или пароль', 'danger')

    return render_template('login.html')


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=current_user.username)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы', 'info')
    return redirect(url_for('index'))


@app.route('/api/kanban/cards', methods=['GET', 'POST'])
@login_required
def handle_cards():
    if request.method == 'GET':
        cards = KanbanCard.query.filter_by(user_id=current_user.id).all()
        return jsonify({
            'cards': [{
                'id': card.id,
                'text': card.text,
                'column': card.column,
                'created': card.created.isoformat() if card.created else None,
                'modified': card.modified.isoformat() if card.modified else None
            } for card in cards]
        })

    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'text' not in data:
                return jsonify({'error': 'Missing text'}), 400

            new_card = KanbanCard(
                text=data['text'],
                column=data.get('column', 'To Do'),
                user_id=current_user.id
            )
            db.session.add(new_card)
            db.session.commit()

            return jsonify({
                'id': new_card.id,
                'text': new_card.text,
                'column': new_card.column,
                'created': new_card.created.isoformat() if new_card.created else None
            }), 201

        except Exception as e:
            logging.error(f"Ошибка при добавлении карты: {e}")
            return jsonify({'error': str(e)}), 500


@app.route('/api/kanban/cards/<int:card_id>', methods=['DELETE'])
@login_required
def delete_card(card_id):
    card = KanbanCard.query.get_or_404(card_id)
    if card.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(card)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/kanban/cards/<int:card_id>/move', methods=['PUT'])
@login_required
def move_card(card_id):
    data = request.get_json()
    if not data or 'column' not in data:
        return jsonify({'error': 'Missing column'}), 400

    card = KanbanCard.query.get_or_404(card_id)
    if card.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403

    if data['column'] not in KANBAN_COLUMNS:
        return jsonify({'error': 'Invalid column'}), 400

    card.column = data['column']
    card.modified = datetime.utcnow()
    db.session.commit()
    return jsonify(card.to_dict())


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Создаем таблицы, если их нет
    app.run(debug=True)