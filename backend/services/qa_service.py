from langchain_openai import ChatOpenAI
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_core.prompts import PromptTemplate
from langchain_community.vectorstores import FAISS
from ..config import settings

SYSTEM_TEMPLATE = """You are a helpful assistant that answers questions about a GitHub repository.
Use the provided code snippets and documentation to give accurate, detailed answers.
If the context doesn't contain enough information to answer fully, say so and suggest which files the user might want to look at.
Always reference specific file paths when possible.

Context from the repository:
{context}

Question: {question}
Answer:"""

QA_PROMPT = PromptTemplate(
    template=SYSTEM_TEMPLATE,
    input_variables=["context", "question"],
)


def get_answer(
    question: str,
    vector_store: FAISS,
    chat_history: list[dict] | None = None,
) -> dict:
    """Run a question through the RetrievalQA chain.

    Returns {"answer": str, "source_files": list[str]}.
    """
    llm = ChatOpenAI(
        model=settings.openai_model,
        temperature=0,
        openai_api_key=settings.openai_api_key,
    )

    retriever = vector_store.as_retriever(
        search_kwargs={"k": settings.retrieval_k}
    )

    # Convert chat history to list of tuples for LangChain
    history_tuples = []
    if chat_history:
        for i in range(0, len(chat_history) - 1, 2):
            if (chat_history[i].get("role") == "user"
                    and i + 1 < len(chat_history)
                    and chat_history[i + 1].get("role") == "assistant"):
                history_tuples.append(
                    (chat_history[i]["content"], chat_history[i + 1]["content"])
                )

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        return_source_documents=True,
        combine_docs_chain_kwargs={"prompt": QA_PROMPT},
    )

    result = chain.invoke({
        "question": question,
        "chat_history": history_tuples,
    })

    source_files = list({
        doc.metadata.get("source", "unknown")
        for doc in result.get("source_documents", [])
    })

    return {
        "answer": result["answer"],
        "source_files": sorted(source_files),
    }
