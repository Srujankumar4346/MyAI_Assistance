from sqlalchemy.orm import Session

from backend.database.models import AppSettings, User
from backend.schemas.schemas import AppSettingsSchema


def get_settings_controller(db: Session, current_user: User):
    app_settings = db.query(AppSettings).filter(AppSettings.user_id == current_user.id).first()
    if not app_settings:
        app_settings = AppSettings(user_id=current_user.id)
        db.add(app_settings)
        db.commit()
        db.refresh(app_settings)
    return app_settings


def update_settings_controller(payload: AppSettingsSchema, db: Session, current_user: User):
    app_settings = db.query(AppSettings).filter(AppSettings.user_id == current_user.id).first()
    if not app_settings:
        app_settings = AppSettings(user_id=current_user.id)
        db.add(app_settings)

    app_settings.theme = payload.theme
    app_settings.selected_model = payload.selected_model
    app_settings.memory_enabled = payload.memory_enabled
    app_settings.streaming_enabled = payload.streaming_enabled
    app_settings.animation_enabled = payload.animation_enabled
    app_settings.auto_save_conversations = payload.auto_save_conversations

    db.commit()
    db.refresh(app_settings)
    return app_settings
