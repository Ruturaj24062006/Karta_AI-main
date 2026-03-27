import os

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL")
    CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
    CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")
    MAX_FILE_SIZE = os.getenv("MAX_FILE_SIZE")

config = Config()
