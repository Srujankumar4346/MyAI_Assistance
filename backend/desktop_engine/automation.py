from backend.desktop_engine.applications import applications_engine
from backend.desktop_engine.windows import windows_engine
from backend.desktop_engine.filesystem import filesystem_engine
from backend.desktop_engine.clipboard import clipboard_engine
from backend.desktop_engine.terminal import terminal_engine
from backend.desktop_engine.system_control import system_control_engine
from backend.desktop_engine.screenshot import screenshot_engine

# High level automation interface exposing the executors
desktop_executors = {
    "open_app": applications_engine.open_app,
    "close_app": applications_engine.close_app,
    "list_apps": applications_engine.list_running_apps,
    
    "focus_window": windows_engine.focus_window,
    "minimize_window": windows_engine.minimize_window,
    "maximize_window": windows_engine.maximize_window,
    
    "filesystem": filesystem_engine.create_file, # requires param mapping wrapper
    "terminal": terminal_engine.run_command,
    "system": system_control_engine.get_status,
    "screenshot": screenshot_engine.take_screenshot,
    "clipboard": clipboard_engine.read,
}
