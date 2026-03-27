from fastapi import APIRouter

from services.news_intelligence_service import get_company_news_intelligence

router = APIRouter()


@router.get("/news/{company_name}")
@router.get("/api/news/{company_name}")
def get_company_news(company_name: str):
    return get_company_news_intelligence(company_name)
