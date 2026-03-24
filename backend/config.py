from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    github_token: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4"
    embedding_model: str = "text-embedding-3-small"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5

    class Config:
        env_file = str(ENV_FILE)


settings = Settings()
