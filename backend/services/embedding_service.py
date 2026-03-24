from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from ..config import settings


def create_vector_store(documents: list[dict]) -> FAISS:
    """Create a FAISS vector store from a list of {"path": str, "content": str} documents.

    Splits documents into chunks, embeds them with OpenAI, and stores in FAISS.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )

    langchain_docs = []
    for doc in documents:
        chunks = text_splitter.split_text(doc["content"])
        for chunk in chunks:
            langchain_docs.append(
                Document(
                    page_content=chunk,
                    metadata={"source": doc["path"]},
                )
            )

    if not langchain_docs:
        raise ValueError("No document chunks to index")

    embeddings = OpenAIEmbeddings(
        model=settings.embedding_model,
        openai_api_key=settings.openai_api_key,
    )

    vector_store = FAISS.from_documents(langchain_docs, embeddings)
    return vector_store
