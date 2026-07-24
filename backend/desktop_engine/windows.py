import pywin32_system32 # ensure loads
import win32gui
import win32con
import win32api
import ctypes

class WindowsEngine:
    """Manages window focusing, resizing, moving."""
    
    def _find_window_by_title(self, title_substring: str):
        hwnd_list = []
        def callback(hwnd, extra):
            title = win32gui.GetWindowText(hwnd)
            if title_substring.lower() in title.lower() and win32gui.IsWindowVisible(hwnd):
                hwnd_list.append((hwnd, title))
            return True
            
        win32gui.EnumWindows(callback, None)
        return hwnd_list

    def focus_window(self, title_substring: str):
        hwnds = self._find_window_by_title(title_substring)
        if not hwnds:
            return {"status": "failed", "message": "Window not found"}
            
        hwnd, title = hwnds[0]
        
        # Unminimize if minimized
        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            
        # Try to bring to foreground (may require attaching thread input depending on Windows version)
        try:
            win32gui.SetForegroundWindow(hwnd)
        except Exception as e:
            # Fallback if Windows blocks SetForegroundWindow
            win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
            
        return {"status": "success", "focused": title}

    def minimize_window(self, title_substring: str):
        hwnds = self._find_window_by_title(title_substring)
        if not hwnds:
            return {"status": "failed", "message": "Window not found"}
        
        hwnd, title = hwnds[0]
        win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
        return {"status": "success", "minimized": title}
        
    def maximize_window(self, title_substring: str):
        hwnds = self._find_window_by_title(title_substring)
        if not hwnds:
            return {"status": "failed", "message": "Window not found"}
            
        hwnd, title = hwnds[0]
        win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
        return {"status": "success", "maximized": title}

windows_engine = WindowsEngine()
