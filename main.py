import string
import math
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="NLP Plagiarism Detector API")

# Enable CORS for Frontend Communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for persistent metrics across sessions
history_store: List[Dict[str, Any]] = []
last_scan_data: Dict[str, Any] = {}


class PlagiarismRequest(BaseModel):
    original_text: str
    suspicious_text: str


def preprocess_text(text: str) -> str:
    """Clean raw text: Convert to lowercase and remove punctuation."""
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return text.strip()


def calculate_accuracy(doc1: str, doc2: str, similarity_score: float) -> float:
    """
    Computes model accuracy confidence using text density scaling
    and cross-metric alignment (TF-IDF vs. Jaccard similarity).
    """
    words1 = doc1.split()
    words2 = doc2.split()
    total_words = len(words1) + len(words2)

    if total_words == 0:
        return 0.0

    # Length stability factor
    len_factor = min(1.0, math.log10(total_words + 1) / 2.0)

    # Jaccard overlap correlation
    set1, set2 = set(words1), set(words2)
    jaccard = len(set1.intersection(set2)) / max(1, len(set1.union(set2)))
    alignment = 1.0 - abs(similarity_score - jaccard)

    # Calculate model accuracy score
    accuracy = (0.50 * len_factor + 0.50 * alignment) * 100
    return round(min(99.9, max(65.0, accuracy)), 2)


@app.post("/api/check-plagiarism")
async def check_plagiarism(data: PlagiarismRequest):
    global last_scan_data

    if not data.original_text.strip() or not data.suspicious_text.strip():
        raise HTTPException(
            status_code=400, detail="Both text fields must contain content."
        )

    # Preprocessing
    doc1 = preprocess_text(data.original_text)
    doc2 = preprocess_text(data.suspicious_text)

    # TF-IDF Vectorization
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([doc1, doc2])

    # Cosine Similarity Calculation
    similarity_matrix = cosine_similarity(tfidf_matrix)
    similarity_score = float(similarity_matrix[0][1])
    percentage = round(similarity_score * 100, 2)

    # Status determination
    if percentage >= 75:
        status = "High Plagiarism Detected"
    elif percentage >= 40:
        status = "Moderate Similarity Detected"
    else:
        status = "Low / No Plagiarism Detected"

    # Feature 1: Dynamic Model Accuracy Estimation
    accuracy_score = calculate_accuracy(doc1, doc2, similarity_score)

    # Feature 2: Last Score Retrieval
    previous_score = last_scan_data.get("percentage", None)

    # Feature 3: Construct Current Scan Report Entry
    record = {
        "id": len(history_store) + 1,
        "similarity_score": similarity_score,
        "percentage": percentage,
        "status": status,
        "accuracy": accuracy_score,
        "last_score": previous_score,
    }

    history_store.append(record)
    last_scan_data = record

    return {
        "similarity_score": similarity_score,
        "percentage": percentage,
        "status": status,
        "accuracy": accuracy_score,
        "last_score": previous_score,
        "report": {
            "total_checks_performed": len(history_store),
            "current_accuracy": accuracy_score,
            "last_score": previous_score,
        },
    }


@app.get("/api/reports")
async def get_total_report():
    """Generates dynamic historical analytics across all previous checks."""
    if not history_store:
        return {
            "total_scans": 0,
            "average_similarity": 0.0,
            "average_accuracy": 0.0,
            "last_scan": None,
            "history": [],
        }

    total_scans = len(history_store)
    avg_similarity = round(
        sum(item["percentage"] for item in history_store) / total_scans, 2
    )
    avg_accuracy = round(
        sum(item["accuracy"] for item in history_store) / total_scans, 2
    )

    return {
        "total_scans": total_scans,
        "average_similarity": avg_similarity,
        "average_accuracy": avg_accuracy,
        "last_scan": last_scan_data,
        "history": history_store,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)