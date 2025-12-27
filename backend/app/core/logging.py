import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict

from app.core.config import settings


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "Timestamp": self.formatTime(record, self.datefmt),
            "Level": record.levelname,
            "Message": record.getMessage(),
            "LoggerName": record.name,
        }
        if hasattr(record, "RequestId"):
            payload["RequestId"] = record.RequestId
        if hasattr(record, "UserId"):
            payload["UserId"] = record.UserId
        return json.dumps(payload)


def configure_logging() -> None:
    log_path = Path(settings.LogFilePath)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=settings.LogMaxBytes,
        backupCount=settings.LogBackupCount,
    )
    formatter = (
        JsonFormatter() if settings.LogJsonEnabled else logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s"
        )
    )
    file_handler.setFormatter(formatter)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(settings.LogLevel)
    root.handlers = [file_handler, console_handler]
