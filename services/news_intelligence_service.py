import re
import urllib.parse
from typing import Any, Dict, List

import feedparser
import requests

try:
    from transformers import pipeline
    _finbert = pipeline("text-classification", model="ProsusAI/finbert")
except Exception:
    _finbert = None


_CRITICAL_NEGATIVE_KEYWORDS = [
    "legal case",
    "nclt",
    "insolvency",
    "fraud",
    "default",
    "drt",
    "petition",
    "raid",
    "winding up",
    "wilful defaulter",
]

_LEGAL_SUFFIXES = {
    "pvt",
    "pvt.",
    "private",
    "ltd",
    "ltd.",
    "limited",
    "llp",
    "inc",
    "inc.",
    "co",
    "co.",
    "company",
}

_GENERIC_COMPANY_TOKENS = {
    "industry",
    "industries",
    "enterprise",
    "enterprises",
    "services",
    "solutions",
    "technologies",
    "technology",
    "global",
    "international",
    "group",
    "holdings",
}

_RSS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
}


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def _company_tokens(company_name: str) -> List[str]:
    toks = [t for t in re.split(r"\W+", (company_name or "").lower()) if t]
    core = [
        t for t in toks
        if t not in _LEGAL_SUFFIXES
        and t not in _GENERIC_COMPANY_TOKENS
        and len(t) > 2
    ]
    return core


def _query_variants(company_name: str) -> List[str]:
    cleaned = _clean_text(company_name)
    core = _company_tokens(cleaned)
    variants: List[str] = []

    if cleaned:
        variants.append(cleaned)

    if core:
        variants.append(" ".join(core))

    if len(core) >= 2:
        variants.append(" ".join(core[:2]))
        variants.append(" ".join(core[-2:]))

    if core:
        # Single distinctive token fallback greatly improves coverage for private-company names.
        variants.append(core[-1])

    # Add finance-context query to improve hit-rate for smaller private entities.
    if core:
        variants.append(f"{' '.join(core[:2])} india company")

    dedup = []
    seen = set()
    for q in variants:
        key = q.strip().lower()
        if key and key not in seen:
            seen.add(key)
            dedup.append(q)
    return dedup[:5]


def _is_relevant_headline(headline: str, company_name: str, strict: bool = True) -> bool:
    h = (headline or "").lower()
    core = _company_tokens(company_name)
    if not core:
        return True
    # Accept if at least one strong token matches; two tokens if enough tokens exist.
    hits = sum(1 for t in core if t in h)
    if strict:
        if len(core) >= 2:
            return hits >= 2
        return hits >= 1
    return hits >= 1


def _fetch_feed(url: str):
    try:
        response = requests.get(url, headers=_RSS_HEADERS, timeout=10)
        response.raise_for_status()
        return feedparser.parse(response.content)
    except Exception:
        # Fallback to native feedparser URL fetch when requests path fails.
        return feedparser.parse(url)


def _score_item_from_sentiment(sentiment: str, confidence: float) -> float:
    confidence_pct = max(0.0, min(1.0, confidence)) * 100.0
    if sentiment == "Bearish":
        return min(100.0, 50.0 + (confidence_pct * 0.5))
    if sentiment == "Bullish":
        return max(0.0, 30.0 - (confidence_pct * 0.2))
    return 40.0


def _sentiment_from_finbert(text: str) -> Dict[str, Any]:
    if not text:
        return {"sentiment": "Neutral", "confidence": 0.0}

    if _finbert is None:
        lowered = text.lower()
        bearish_tokens = ["default", "fraud", "loss", "downgrade", "insolvency", "petition"]
        bullish_tokens = ["growth", "profit", "expansion", "upgrade", "order win", "strong"]
        bearish_hits = sum(1 for t in bearish_tokens if t in lowered)
        bullish_hits = sum(1 for t in bullish_tokens if t in lowered)
        if bearish_hits > bullish_hits:
            return {"sentiment": "Bearish", "confidence": 0.7}
        if bullish_hits > bearish_hits:
            return {"sentiment": "Bullish", "confidence": 0.7}
        return {"sentiment": "Neutral", "confidence": 0.5}

    try:
        result = _finbert(text[:512])[0]
        label = str(result.get("label", "neutral")).lower()
        confidence = float(result.get("score", 0.0) or 0.0)
        if label == "negative":
            return {"sentiment": "Bearish", "confidence": confidence}
        if label == "positive":
            return {"sentiment": "Bullish", "confidence": confidence}
        return {"sentiment": "Neutral", "confidence": confidence}
    except Exception:
        return {"sentiment": "Neutral", "confidence": 0.5}


def _google_news_rss(company_name: str) -> List[Dict[str, Any]]:
    def _collect(strict: bool) -> List[Dict[str, Any]]:
        collected: List[Dict[str, Any]] = []
        for query in _query_variants(company_name):
            encoded = urllib.parse.quote(query)
            url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
            feed = _fetch_feed(url)
            for entry in feed.entries[:25]:
                headline = _clean_text(entry.get("title", ""))
                if not headline:
                    continue
                if not _is_relevant_headline(headline, company_name, strict=strict):
                    continue
                collected.append({
                    "headline": headline,
                    "source": "Google News",
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                })
            if len(collected) >= 12:
                break
        return collected

    strict_articles = _collect(strict=True)
    if strict_articles:
        return strict_articles
    # Relax matching when strict entity match yields no hits.
    return _collect(strict=False)


def _livemint_rss(company_name: str) -> List[Dict[str, Any]]:
    feeds = [
        "https://www.livemint.com/rss/news",
        "https://www.livemint.com/rss/companies",
    ]
    company_tokens = _company_tokens(company_name)
    articles: List[Dict[str, Any]] = []

    for feed_url in feeds:
        feed = _fetch_feed(feed_url)
        for entry in feed.entries[:30]:
            headline = _clean_text(entry.get("title", ""))
            if not headline:
                continue
            lowered = headline.lower()
            if company_tokens and not _is_relevant_headline(headline, company_name, strict=False):
                continue
            articles.append({
                "headline": headline,
                "source": "LiveMint",
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
            })
    return articles


def fetch_company_news(company_name: str) -> List[Dict[str, Any]]:
    """Return headline-level sentiment and risk impact list for a company."""
    raw_articles = _google_news_rss(company_name) + _livemint_rss(company_name)

    dedup: Dict[str, Dict[str, Any]] = {}
    for article in raw_articles:
        key = article["headline"].strip().lower()
        if key not in dedup:
            dedup[key] = article

    enriched: List[Dict[str, Any]] = []
    for article in list(dedup.values())[:25]:
        sentiment_info = _sentiment_from_finbert(article["headline"])
        sentiment = sentiment_info["sentiment"]
        confidence = sentiment_info["confidence"]
        risk_impact = _score_item_from_sentiment(sentiment, confidence)

        enriched.append({
            "headline": article["headline"],
            "source": article["source"],
            "sentiment": sentiment,
            "risk_impact_score": round(risk_impact, 1),
            "confidence": round(confidence, 4),
            "link": article.get("link", ""),
            "published": article.get("published", ""),
        })

    return enriched


def calculate_external_risk_score(news_items: List[Dict[str, Any]]) -> float:
    if not news_items:
        return 35.0

    avg_impact = sum(float(item.get("risk_impact_score", 40.0)) for item in news_items) / len(news_items)
    return round(max(0.0, min(100.0, avg_impact)), 1)


def detect_critical_negative_event(news_items: List[Dict[str, Any]]) -> bool:
    for item in news_items:
        if item.get("sentiment") != "Bearish":
            continue
        headline = str(item.get("headline", "")).lower()
        if any(k in headline for k in _CRITICAL_NEGATIVE_KEYWORDS):
            return True
    return False


def get_company_news_intelligence(company_name: str) -> Dict[str, Any]:
    items = fetch_company_news(company_name)
    external_risk_score = calculate_external_risk_score(items)
    critical_negative_event = detect_critical_negative_event(items)

    return {
        "company_name": company_name,
        "external_risk_score": external_risk_score,
        "critical_negative_event": critical_negative_event,
        "articles": items,
    }
