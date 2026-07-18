from fastapi import FastAPI

app = FastAPI(title="MediLink AI Service")


@app.get("/health")
def health() -> dict:
    return {"status": "OK", "service": "medilink-ai-service"}
