import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    LoadRepoRequest, LoadRepoResponse,
    AskRequest, AskResponse,
)
from .services.github_service import parse_repo_url, fetch_repo_files
from .services.embedding_service import create_vector_store
from .services.qa_service import get_answer

app = FastAPI(title="GitHub Repo Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory stores
repo_stores: dict = {}      # "owner/repo" -> FAISS vector store
repo_metadata: dict = {}    # "owner/repo" -> metadata dict


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/load-repo", response_model=LoadRepoResponse)
async def load_repo(request: LoadRepoRequest):
    try:
        owner, repo = parse_repo_url(request.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    repo_key = f"{owner}/{repo}"

    # Return cached if already indexed
    if repo_key in repo_stores:
        meta = repo_metadata[repo_key]
        return LoadRepoResponse(
            repo_name=repo_key,
            description=meta["description"],
            files_indexed=meta["files_indexed"],
            file_list=meta["file_list"],
        )

    try:
        meta, documents, all_paths = await fetch_repo_files(owner, repo)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="GitHub token is invalid or expired. Update it in your .env file.")
        if e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit exceeded or access denied. Check your GitHub token.")
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Repository not found. Check the URL or ensure the repo is public (or your token has access).")
        raise HTTPException(status_code=400, detail=f"Failed to fetch repo: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repo: {e}")

    if not documents:
        raise HTTPException(status_code=400, detail="No indexable files found in repository. This may be caused by an invalid/expired GitHub token — file fetches may be silently failing.")

    try:
        vector_store = create_vector_store(documents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create embeddings: {e}")

    repo_stores[repo_key] = vector_store
    repo_metadata[repo_key] = {
        "description": meta["description"],
        "files_indexed": len(documents),
        "file_list": all_paths,
    }

    return LoadRepoResponse(
        repo_name=repo_key,
        description=meta["description"],
        files_indexed=len(documents),
        file_list=all_paths,
    )


@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    try:
        owner, repo = parse_repo_url(request.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    repo_key = f"{owner}/{repo}"

    if repo_key not in repo_stores:
        raise HTTPException(
            status_code=400,
            detail="Repository not loaded. Please load the repo first.",
        )

    try:
        result = get_answer(
            question=request.question,
            vector_store=repo_stores[repo_key],
            chat_history=request.chat_history,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {e}")

    return AskResponse(
        answer=result["answer"],
        source_files=result["source_files"],
    )
