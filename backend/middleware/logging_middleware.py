import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from backend.utils.logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"API Request: {request.method} {request.url.path} from {client_ip}")

        try:
            response = await call_next(request)
            duration = (time.time() - start_time) * 1000  # ms
            logger.info(
                f"API Response: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - Performance: {duration:.2f}ms"
            )
            return response
        except Exception as e:
            duration = (time.time() - start_time) * 1000  # ms
            logger.error(
                f"API Error: {request.method} {request.url.path} failed - "
                f"Details: {str(e)} - Performance: {duration:.2f}ms",
                exc_info=True,
            )
            raise e
