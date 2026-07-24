import os
import shutil


class FilesystemEngine:
    """Manages files and folders safely."""

    def create_folder(self, path: str):
        os.makedirs(path, exist_ok=True)
        return {"status": "success", "path": path}

    def delete_folder(self, path: str):
        if os.path.exists(path):
            shutil.rmtree(path)
        return {"status": "success"}

    def create_file(self, path: str, content: str = ""):
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"status": "success", "path": path}

    def delete_file(self, path: str):
        if os.path.exists(path):
            os.remove(path)
        return {"status": "success"}

    def move(self, src: str, dest: str):
        shutil.move(src, dest)
        return {"status": "success"}

    def copy(self, src: str, dest: str):
        if os.path.isdir(src):
            shutil.copytree(src, dest)
        else:
            shutil.copy2(src, dest)
        return {"status": "success"}


filesystem_engine = FilesystemEngine()
