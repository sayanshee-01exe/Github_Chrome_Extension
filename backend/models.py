from pydantic import BaseModel


class LoadRepoRequest(BaseModel):
    repo_url: str


class LoadRepoResponse(BaseModel):
    repo_name: str
    description: str
    files_indexed: int
    file_list: list[str]


class AskRequest(BaseModel):
    question: str
    repo_url: str
    chat_history: list[dict] | None = []


class AskResponse(BaseModel):
    answer: str
    source_files: list[str]
