import warnings
from fastapi import FastAPI, HTTPException, Request, Depends, status, File, UploadFile, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, RootModel, EmailStr
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
import os

from fastapi.responses import FileResponse
from sklearn.exceptions import InconsistentVersionWarning
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

from fastapi.middleware.cors import CORSMiddleware
from keystroke_model import predict_keystroke
from mouse_model import predict_mouse
from webcam_models import predict_webcam

app = FastAPI(title="Stroke Recovery Combined API with Auth & Sessions")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_DETAILS = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.stroke_recovery
user_collection = database.get_collection("users")
session_collection = database.get_collection("sessions")

PDF_FOLDER = "generated_pdfs"
os.makedirs(PDF_FOLDER, exist_ok=True)

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="signin")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(username: str):
    user = await user_collection.find_one({"username": username})
    return user

async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if user["password"] != password:
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await get_user(username)
    if user is None:
        raise credentials_exception

    return user

class UserSignup(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserSignin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class KeystrokeFeatures(RootModel[Dict[str, Any]]):
    root: Dict[str, Any] = Field(...)

class MouseFeatures(RootModel[Dict[str, Any]]):
    root: Dict[str, Any] = Field(...)

class WebcamFeatures(RootModel[Dict[str, Any]]):
    root: Dict[str, Any] = Field(...)

class AllFeatures(BaseModel):
    keystroke_features: Optional[Dict[str, Any]] = None
    mouse_features: Optional[Dict[str, Any]] = None
    webcam_features: Optional[WebcamFeatures] = None

class PredictionSession(BaseModel):
    username: str
    final_score: float
    final_category: str
    keystroke_score: float
    mouse_score: float
    webcam_score: float
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    pdf_filename: str

@app.post("/signup", tags=["Auth"], status_code=201)
async def signup(user: UserSignup):
    if await get_user(user.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    await user_collection.insert_one(user.dict())
    return {"message": "User created successfully"}

@app.post("/signin", tags=["Auth"], response_model=Token)
async def signin(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": user["username"]}, expires_delta=token_expires)

    return {"access_token": token, "token_type": "bearer"}

@app.get("/profile", tags=["Auth"])
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "email": current_user["email"]}

# PDF upload endpoint
@app.post("/upload-pdf", tags=["Sessions"])
async def upload_pdf(
    username: str = Query(..., description="Username of the patient"),
    file: UploadFile = File(...)
):
    os.makedirs(PDF_FOLDER, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    filename = f"StrokeReport_{username}_{timestamp}.pdf"
    file_path = os.path.join(PDF_FOLDER, filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"filename": filename}

@app.post("/sessions", tags=["Sessions"])
async def save_session(session: PredictionSession):
    await session_collection.insert_one(session.dict())
    return {"message": "Session saved"}

@app.get("/sessions/{username}", tags=["Sessions"])
async def get_session_history(username: str):
    cursor = session_collection.find({"username": username})
    sessions = []
    async for s in cursor:
        s["id"] = str(s["_id"])
        del s["_id"]
        sessions.append(s)
    return sessions

@app.get("/sessions/pdf/{filename}", tags=["Sessions"])
async def download_pdf(filename: str):
    file_path = os.path.join(PDF_FOLDER, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(path=file_path, filename=filename, media_type="application/pdf")

# Prediction endpoints (your existing models) left unchanged
@app.get("/")
def home():
    return {"message": "Stroke Recovery Prediction API with Auth & Sessions is running!"}

@app.post("/predict/keystroke", tags=["Individual Models"])
async def predict_keystroke_endpoint(data: KeystrokeFeatures):
    try:
        score = predict_keystroke(data.root)
        if score is None:
            raise HTTPException(status_code=400, detail="Keystroke prediction failed.")
        return {"keystroke_score": float(score)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Keystroke model error: {str(e)}")

@app.post("/predict/mouse", tags=["Individual Models"])
async def predict_mouse_endpoint(data: MouseFeatures):
    try:
        defaults = {
            'Errors': 0, 'CorrectionBehavior': 0, 'TypingSpeed_WPM': 0,
            'TypingSpeed_CPM': 0, 'AverageDwellTime': 0, 'AverageFlightTime': 0,
            'Consistency': 0, 'AccuracyScore': 0, 'IdleTime_Ratio': 0
        }
        combined = {**defaults, **data.root}
        score = predict_mouse(combined)
        return {"mouse_score": float(score)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mouse model error: {str(e)}")

@app.post("/predict/webcam", tags=["Individual Models"])
async def predict_webcam_endpoint(data: WebcamFeatures):
    try:
        result = predict_webcam(data.root)
        return {
            "webcam_score": float(result.get("recovery_score", 0.0)),
            "webcam_class": result.get("class_prediction", "unknown")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webcam model error: {str(e)}")

@app.post("/predict/all", tags=["Combined Model"])
async def predict_all_endpoint(data: AllFeatures, request: Request):
    try:
        raw = await request.json()

        ks_score = raw.get("keystroke_score")
        ms_score = raw.get("mouse_score")
        wc_score = raw.get("webcam_score")
        wc_class = raw.get("webcam_class")

        if ks_score is None and data.keystroke_features:
            ks_score = predict_keystroke(data.keystroke_features)

        if ms_score is None and data.mouse_features:
            combined_mouse = {**(data.keystroke_features or {}), **data.mouse_features}
            ms_score = predict_mouse(combined_mouse)

        if wc_score is None:
            webcam_input = (
                data.webcam_features.root if data.webcam_features
                else raw.get("webcam_features")
            )
            if webcam_input:
                wc = predict_webcam(webcam_input)
                wc_score = wc.get("recovery_score")
                wc_class = wc.get("class_prediction")

        scores = [s for s in [ks_score, ms_score, wc_score] if s is not None]
        final_score = round(sum(scores) / len(scores), 2) if scores else None

        def classify(score):
            if score is None: return None
            if score >= 80: return "excellent"
            if score >= 60: return "good"
            if score >= 40: return "average"
            return "poor"

        final_category = classify(final_score)

        return {
            "keystroke_score": ks_score,
            "mouse_score": ms_score,
            "webcam_score": wc_score,
            "webcam_class": wc_class,
            "final_score": final_score,
            "final_category": final_category,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in /predict/all: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
