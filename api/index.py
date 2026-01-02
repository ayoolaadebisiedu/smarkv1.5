import sys
import os
import traceback

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Set environment for serverless
os.environ.setdefault("VERCEL", "1")

try:
    # Import the FastAPI app
    from backend.main import app
    
    # Middleware to strip /api prefix from requests
    from starlette.middleware.base import BaseHTTPMiddleware
    from fastapi import Request
    
    class StripAPIPrefix(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            # Strip /api prefix if present
            path = request.url.path
            if path.startswith("/api"):
                # Remove /api prefix
                new_path = path[4:] or "/"
                # Create new request with updated path
                scope = dict(request.scope)
                scope["path"] = new_path
                scope["raw_path"] = new_path.encode()
                request = Request(scope, request.receive)
            return await call_next(request)
    
    app.add_middleware(StripAPIPrefix)
    
except Exception as e:
    # Create error app for debugging
    from fastapi import FastAPI
    app = FastAPI(title="Smark API - Error")
    
    @app.get("/")
    @app.get("/{path:path}")
    def error_handler(path: str = ""):
        return {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc().split("\n")[-10:],  # Last 10 lines
            "project_root": project_root,
            "path": path
        }

# Export app for Vercel 
