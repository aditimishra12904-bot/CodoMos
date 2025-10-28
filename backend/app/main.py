from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.db.mongo import init_mongo
from app.models import User
from app.core.security import get_password_hash
from fastapi import Request
import json

try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover - optional import
    genai = None

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

app.add_middleware(
    CORSMiddleware,
    # For local dev, allow all origins (covers localhost/127.0.0.1 mismatch)
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Initialize Mongo + Beanie (may be skipped if no URI in dev)
    connected = await init_mongo()
    if connected:
        # Seed admin if not exists
        admin_email = "admin@cogniwork.dev"
        existing = await User.find_one(User.email == admin_email)
        if not existing:
            admin = User(
                email=admin_email,
                full_name="Admin",
                role="admin",
                hashed_password=get_password_hash("admin"),
            )
            await admin.insert()


@app.get("/")
async def root():
    return {"message": "CogniWork API is running"}


@app.post("/chat")
async def chat(request: Request):
    """Chat endpoint that uses Google Gemini (if available) to reply.
    Falls back to a safe echo response when Gemini is not configured or an error occurs.
    """
    body = await request.json()
    message = body.get("message") if isinstance(body, dict) else None
    if not message:
        return {"reply": "I didn't receive a message. Send a JSON body like { \"message\": \"hi\" }"}

    # If Gemini is available and an API key is configured, use it.
    if genai is not None and settings.GEMINI_API_KEY:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL', None) or None)
            system = (
                "You are CogniBot, a helpful assistant for the CogniWork application. "
                "Be concise and friendly. Reply in plain text only."
            )
            # Use the model to generate a short reply based on the user's message
            resp = model.generate_content([system, message])
            text = (resp.text or '').strip()
            if text:
                return {"reply": text}
        except Exception as e:
            # Log the error to the console and fall back to echo reply
            print("Gemini chat error:", e)

    # Fallback reply
    return {"reply": f"CogniBot (dev): I received your message: \"{message}\""}


app.include_router(api_router, prefix=settings.API_V1_STR)
