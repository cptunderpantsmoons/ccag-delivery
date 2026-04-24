"""Vector store API service."""

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from typing import List, Optional, Dict
import structlog

from app.vector_store import VectorStore
from app.config import settings

logger = structlog.get_logger()
app = FastAPI(title="Carbon Agent Vector Store", version="1.0.0")

# Initialize vector store
store = VectorStore()


class Document(BaseModel):
    text: str
    metadata: Dict = {}


class AddDocumentsRequest(BaseModel):
    documents: List[Document]
    ids: Optional[List[str]] = None
    batch_size: int = 500


class SearchRequest(BaseModel):
    query: str
    n_results: int = 10
    where_filter: Optional[Dict] = None


class ScopedStatsRequest(BaseModel):
    where_filter: Optional[Dict] = None


class DeleteRequest(BaseModel):
    where_filter: Dict


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "vector-store"}


@app.get("/readyz")
async def readyz(response: Response):
    """Readiness endpoint with vector backend check."""
    ready = False
    total_documents = None

    try:
        stats = store.get_stats()
        total_documents = stats.get("total_documents")
        ready = isinstance(total_documents, int)
    except Exception as exc:
        logger.warning("readiness_check_failed", error=str(exc))

    if not ready:
        response.status_code = 503

    return {
        "status": "ready" if ready else "not_ready",
        "service": "vector-store",
        "components": {
            "collection": ready,
        },
        "total_documents": total_documents,
    }


@app.get("/stats")
async def stats():
    """Get vector store statistics."""
    return store.get_stats()


@app.post("/stats")
async def scoped_stats(request: ScopedStatsRequest):
    """Get scoped vector store statistics."""
    try:
        return store.get_stats(where_filter=request.where_filter)
    except Exception as e:
        logger.error("scoped_stats_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch vector stats")


@app.post("/add")
async def add_documents(request: AddDocumentsRequest):
    """Add documents to the vector store."""
    try:
        texts = [doc.text for doc in request.documents]
        metadatas = [doc.metadata for doc in request.documents]
        added = store.add_documents(
            documents=texts,
            metadatas=metadatas,
            ids=request.ids,
            batch_size=request.batch_size,
        )
        return {"added": added, "total_submitted": len(texts)}
    except Exception as e:
        logger.error("add_documents_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to add documents")


@app.post("/search")
async def search(request: SearchRequest):
    """Search the vector store."""
    try:
        results = store.search(
            query=request.query,
            n_results=request.n_results,
            where_filter=request.where_filter,
        )
        return results
    except Exception as e:
        logger.error("search_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to search vector store")


@app.post("/delete")
async def delete_documents(request: DeleteRequest):
    """Delete only documents matching the provided metadata filter."""
    try:
        deleted = store.delete_documents(where_filter=request.where_filter)
        return {"deleted": deleted}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("delete_documents_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete documents")


@app.post("/clear")
async def clear():
    """Clear all documents from the vector store."""
    try:
        store.clear()
        return {"message": "Vector store cleared."}
    except Exception as e:
        logger.error("clear_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to clear vector store")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
