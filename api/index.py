import sys
import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    # Import the FastAPI app
    from backend.main import app
    
    # Middleware to strip /api prefix from incoming requests
    class StripAPIPrefix(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            # If path starts with /api, remove it
            if request.url.path.startswith("/api"):
                path = request.url.path[4:]  # Remove "/api"
                if not path:
                    path = "/"
                elif not path.startswith("/"):
                    path = "/" + path
                
                # Create a new request with updated path
                scope = request.scope.copy()
                scope["path"] = path
                scope["raw_path"] = path.encode()
                
                # Create new request with updated scope
                new_request = Request(scope, request.receive)
                response = await call_next(new_request)
                return response
            
            return await call_next(request)
    
    # Add the middleware
    app.add_middleware(StripAPIPrefix)
    
except Exception as e:
    # If import fails, create a minimal app for debugging
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    def error():
        return {"error": f"Failed to import backend: {str(e)}", "project_root": project_root}
    
    @app.get("/{path:path}")
    def catch_all(path: str):
        return {"error": f"Backend not loaded: {str(e)}", "path": path}

# Vercel automatically detects 'app' from Python files in api/ directory
# Routes defined in backend/main.py will be accessible at /api/* 
