from backend.utils.logger import logger
import json
import uuid

from sqlalchemy.orm import Session

from backend.desktop_engine.models import AutomationMacro


class MacroEngine:
    def __init__(self):
        logger.info('Executed Desktop command successfully')

    def save_macro(
        self, db: Session, user_id: int, name: str, trigger: str, steps: list
    ) -> AutomationMacro:
        macro = AutomationMacro(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name,
            trigger_phrase=trigger,
            steps_json=json.dumps(steps),
        )
        db.add(macro)
        db.commit()
        db.refresh(macro)
        return macro

    def execute_macro(
        self, db: Session, user_id: int, macro_id: str, pipeline_instance, context: dict
    ):
        macro = db.query(AutomationMacro).filter_by(id=macro_id, user_id=user_id).first()
        if not macro:
            raise ValueError("Macro not found")

        steps = json.loads(macro.steps_json)
        results = []

        # Sequentially run through the pipeline
        for step in steps:
            action_type = step.get("action_type")
            target = step.get("target")
            level = step.get("level")  # Should be mapped back to PermissionLevel enum in router
            params = step.get("params", {})

            # The executor func needs to be resolved by the router.
            # We assume `context['executors']` has the mapping.
            executor = context.get("executors", {}).get(action_type)
            if not executor:
                results.append({"status": "failed", "step": step, "message": "Unknown executor"})
                break

            res = pipeline_instance.execute_action(
                db=db,
                user_id=user_id,
                action_type=action_type,
                target=target,
                level=level,
                params=params,
                executor_func=executor,
            )
            results.append(res)

            if res.get("status") in ["blocked", "pending_approval", "failed"]:
                # Stop macro execution if a step fails or blocks
                break

        return {"macro": macro.name, "results": results}


macro_engine = MacroEngine()
