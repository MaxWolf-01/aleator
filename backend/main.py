import uvicorn

if __name__ == "__main__":
    from fastapi import FastAPI

    app = FastAPI(title="Aleator API", version="0.1.0")

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    uvicorn.run(app, host="0.0.0.0", port=8000)
else:
    from fastapi import FastAPI

    app = FastAPI(title="Aleator API", version="0.1.0")

    @app.get("/health")
    async def health():
        return {"status": "healthy"}
