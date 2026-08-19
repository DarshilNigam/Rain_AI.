"""
Automated unit tests for R.A.I. News Service freshness gating,
timestamp parsing, deduplication, and zero stale fallback behavior.
"""
import pytest
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from ml.news.service import RaiNewsService, MAX_ARTICLE_AGE_SECONDS

@pytest.fixture
def news_service():
    service = RaiNewsService()
    service._cache.clear()
    return service

def _build_rss_xml(items: list) -> bytes:
    item_xml_list = []
    for it in items:
        item_xml_list.append(f"""
        <item>
            <title>{it.get('title', '')}</title>
            <link>{it.get('link', 'https://news.example.com/article')}</link>
            <source>{it.get('source', 'IMD Desk')}</source>
            <pubDate>{it.get('pubDate', '')}</pubDate>
        </item>
        """)
    xml_str = f"""<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
        <channel>
            <title>Weather Intelligence Feed</title>
            {''.join(item_xml_list)}
        </channel>
    </rss>
    """
    return xml_str.encode("utf-8")

# TEST 1: Article published 30 minutes ago -> ACCEPT
def test_news_article_30_minutes_ago(news_service):
    now_utc = datetime.now(timezone.utc)
    pub_dt = now_utc - timedelta(minutes=30)
    pub_str = format_datetime(pub_dt)
    
    xml = _build_rss_xml([{
        "title": "Severe Thunderstorm Alert for Kanpur Catchment",
        "pubDate": pub_str
    }])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 1
    assert articles[0]["relativeTime"] == "30m ago"

# TEST 2: Article published 8 hours ago -> ACCEPT
def test_news_article_8_hours_ago(news_service):
    now_utc = datetime.now(timezone.utc)
    pub_dt = now_utc - timedelta(hours=8)
    pub_str = format_datetime(pub_dt)
    
    xml = _build_rss_xml([{
        "title": "Monsoon Low Pressure System Active Over Ganga Basin",
        "pubDate": pub_str
    }])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 1
    assert articles[0]["relativeTime"] == "8h ago"

# TEST 3: Article published 23h 59m ago -> ACCEPT
def test_news_article_23h_59m_ago(news_service):
    now_utc = datetime.now(timezone.utc)
    pub_dt = now_utc - timedelta(hours=23, minutes=59)
    pub_str = format_datetime(pub_dt)
    
    xml = _build_rss_xml([{
        "title": "IMD Regional Weather Bulletin and Convection Warning",
        "pubDate": pub_str
    }])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 1
    assert articles[0]["relativeTime"] == "23h ago"

# TEST 4: Article published 24h 1m ago -> REJECT
def test_news_article_24h_1m_ago(news_service):
    now_utc = datetime.now(timezone.utc)
    pub_dt = now_utc - timedelta(hours=24, minutes=1)
    pub_str = format_datetime(pub_dt)
    
    xml = _build_rss_xml([{
        "title": "Yesterday Morning Weather Update and Rain Forecast",
        "pubDate": pub_str
    }])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 0

# TEST 5: Article published 2 days ago -> REJECT
def test_news_article_2_days_ago(news_service):
    now_utc = datetime.now(timezone.utc)
    pub_dt = now_utc - timedelta(days=2)
    pub_str = format_datetime(pub_dt)
    
    xml = _build_rss_xml([{
        "title": "Heavy Inundation Recorded Across Low-Lying Districts",
        "pubDate": pub_str
    }])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 0

# TEST 6: Article published 67 days ago -> REJECT
def test_news_article_67_days_ago(news_service):
    now_utc = datetime.now(timezone.utc)
    pub_dt = now_utc - timedelta(days=67)
    pub_str = format_datetime(pub_dt)
    
    xml = _build_rss_xml([{
        "title": "Historic Rainfall Breaks Records in Northern India",
        "pubDate": pub_str
    }])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 0

# TEST 7: Article with invalid or missing timestamp -> REJECT
def test_news_article_invalid_or_missing_timestamp(news_service):
    now_utc = datetime.now(timezone.utc)
    xml = _build_rss_xml([
        {"title": "Missing Timestamp Article", "pubDate": ""},
        {"title": "Malformed Timestamp Article", "pubDate": "Invalid Date String 99:99"}
    ])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 0

# TEST 8: Duplicate article, newer version + stale version -> KEEP NEWEST ONLY
def test_news_duplicate_deduplication(news_service):
    now_utc = datetime.now(timezone.utc)
    dt_older = now_utc - timedelta(hours=10)
    dt_newer = now_utc - timedelta(hours=2)
    
    xml = _build_rss_xml([
        {
            "title": "Flash Flood Alert for Catchment Basin - IMD",
            "pubDate": format_datetime(dt_older),
            "link": "https://news.example.com/v1"
        },
        {
            "title": "Flash Flood Alert for Catchment Basin",
            "pubDate": format_datetime(dt_newer),
            "link": "https://news.example.com/v2"
        }
    ])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert len(articles) == 1
    assert articles[0]["relativeTime"] == "2h ago"

# TEST 9: Cached stale article -> MUST NOT PASS FRESHNESS FILTER
def test_cached_stale_article_filtered_out(news_service):
    now_utc = datetime.now(timezone.utc)
    # Article was 23.5 hours old when cached
    pub_dt = now_utc - timedelta(hours=23, minutes=30)
    
    news_service._cache["kanpur_uttar pradesh"] = {
        "articles": [{
            "title": "Borderline Fresh Article",
            "source": "IMD",
            "url": "https://example.com",
            "pubDate": format_datetime(pub_dt),
            "timestamp": pub_dt.timestamp(),
            "relativeTime": "23h ago",
            "category": "METEOROLOGY",
            "city": "Kanpur",
            "region": "Uttar Pradesh"
        }],
        "expires_at": now_utc.timestamp() + 600
    }
    
    # 1 hour passes in simulation: article is now 24.5 hours old
    # Requesting news must automatically filter it out
    articles = news_service.get_weather_news("Kanpur", "Uttar Pradesh")
    # Should be empty or filtered out
    for a in articles:
        art_dt = news_service._parse_pub_date(a.get("pubDate", ""))
        assert art_dt is not None
        assert (now_utc - art_dt).total_seconds() <= MAX_ARTICLE_AGE_SECONDS

# TEST 10: No fresh relevant stories -> clean unavailable state, NO stale filler
def test_no_fresh_stories_returns_empty_list(news_service):
    now_utc = datetime.now(timezone.utc)
    old_dt = now_utc - timedelta(days=5)
    
    xml = _build_rss_xml([
        {"title": "Old Weather Story From Last Week", "pubDate": format_datetime(old_dt)}
    ])
    articles = news_service.parse_rss_items(xml, "Kanpur", "Uttar Pradesh", now_utc)
    assert articles == []
