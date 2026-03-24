import base64
import logging
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"

TEXT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".md", ".txt", ".json", ".yaml",
    ".yml", ".toml", ".cfg", ".ini", ".html", ".css", ".go", ".rs", ".java",
    ".c", ".cpp", ".h", ".rb", ".php", ".sh", ".bat", ".ps1", ".r", ".sql",
    ".xml", ".csv", ".env.example", ".gitignore", ".dockerignore",
    "Makefile", "Dockerfile", "Procfile",
}

MAX_FILE_SIZE = 100_000  # 100KB
MAX_FILES = 100


def _headers():
    h = {"Accept": "application/vnd.github.v3+json"}
    if settings.github_token:
        h["Authorization"] = f"Bearer {settings.github_token}"
    return h


def _is_text_file(path: str) -> bool:
    lower = path.lower()
    basename = path.rsplit("/", 1)[-1]
    if basename in {"Makefile", "Dockerfile", "Procfile", ".gitignore", ".dockerignore"}:
        return True
    return any(lower.endswith(ext) for ext in TEXT_EXTENSIONS)


def parse_repo_url(repo_url: str) -> tuple[str, str]:
    """Extract owner and repo from a GitHub URL."""
    repo_url = repo_url.split("#")[0].split("?")[0].rstrip("/")
    if "github.com/" in repo_url:
        parts = repo_url.split("github.com/")[1].split("/")
        if len(parts) >= 2:
            return parts[0], parts[1].replace(".git", "")
    raise ValueError(f"Invalid GitHub URL: {repo_url}")


async def fetch_repo_meta(owner: str, repo: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}",
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "description": data.get("description") or "",
            "language": data.get("language") or "",
            "stars": data.get("stargazers_count", 0),
            "default_branch": data.get("default_branch", "main"),
        }


async def fetch_file_tree(owner: str, repo: str, branch: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        tree = resp.json().get("tree", [])
        return [
            {"path": item["path"], "size": item.get("size", 0)}
            for item in tree
            if item["type"] == "blob"
        ]


async def fetch_file_content(owner: str, repo: str, path: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("encoding") == "base64" and data.get("content"):
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return ""


async def fetch_repo_files(owner: str, repo: str) -> tuple[dict, list[dict]]:
    """Fetch repo metadata and text file contents.

    Returns (metadata, documents) where documents is a list of
    {"path": str, "content": str}.
    """
    meta = await fetch_repo_meta(owner, repo)
    tree = await fetch_file_tree(owner, repo, meta["default_branch"])

    # Filter to text files under size limit
    text_files = [
        f for f in tree
        if _is_text_file(f["path"]) and f["size"] <= MAX_FILE_SIZE
    ]

    # Prioritize: README first, then config files, then by depth
    def priority(f):
        p = f["path"].lower()
        if "readme" in p:
            return (0, p)
        if p.endswith((".json", ".toml", ".yaml", ".yml", ".cfg", ".ini")):
            return (1, p)
        depth = p.count("/")
        return (2 + depth, p)

    text_files.sort(key=priority)
    text_files = text_files[:MAX_FILES]

    documents = []
    errors = []
    for f in text_files:
        try:
            content = await fetch_file_content(owner, repo, f["path"])
            if content.strip():
                documents.append({"path": f["path"], "content": content})
        except Exception as e:
            errors.append(f"{f['path']}: {e}")
            continue

    if errors:
        logger.warning(
            "Failed to fetch %d/%d files from %s/%s. First error: %s",
            len(errors), len(text_files), owner, repo, errors[0],
        )

    all_paths = [f["path"] for f in tree]
    return meta, documents, all_paths
