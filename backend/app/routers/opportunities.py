from typing import List, Optional
from fastapi import APIRouter, Query
from bson import ObjectId

from ..database import get_db

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def _doc_to_opp(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("")
async def list_opportunities(
    portal: Optional[str] = None,
    naics: Optional[str] = None,
    set_aside: Optional[str] = None,
    state: Optional[str] = None,
    relevance: Optional[str] = None,
    urgent_only: bool = False,
    sort: str = "relevance",
    limit: int = Query(default=50, le=200),
    skip: int = 0,
):
    db = get_db()
    query: dict = {}
    if portal:
        query["portal"] = portal
    if naics:
        query["naics_codes"] = naics
    if set_aside:
        query["set_asides"] = set_aside
    if state:
        query["state"] = state
    if relevance:
        query["relevance_label"] = relevance
    if urgent_only:
        query["is_urgent"] = True

    sort_field = "relevance_score" if sort == "relevance" else "posted_date"
    cursor = db["opportunities"].find(query).sort(sort_field, -1).skip(skip).limit(limit)
    items = [_doc_to_opp(doc) async for doc in cursor]
    total = await db["opportunities"].count_documents(query)
    return {"items": items, "total": total, "limit": limit, "skip": skip}


@router.get("/{opp_id}")
async def get_opportunity(opp_id: str):
    db = get_db()
    doc = await db["opportunities"].find_one({"_id": ObjectId(opp_id)})
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return _doc_to_opp(doc)
