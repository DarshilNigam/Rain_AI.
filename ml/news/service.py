"""
R.A.I. Real-Time Meteorological & Weather News Ingestion Service.
Fetches location-contextual rainfall, flood, monsoon, and weather headlines
via free RSS and news aggregation feeds with in-memory caching and resilient fallbacks.
"""
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import html
import re
from typing import List, Dict, Any, Optional

NEWS_CACHE_TTL_SECONDS = 10 * 60  # 10 minutes cache

class RaiNewsService:
    _instance: Optional["RaiNewsService"] = None

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_instance(cls) -> "RaiNewsService":
        if cls._instance is None:
            cls._instance = RaiNewsService()
        return cls._instance

    @staticmethod
    def _clean_title(raw_title: str) -> str:
        """Strips HTML entities and trailing source suffix from RSS titles."""
        clean = html.unescape(raw_title.strip())
        # Remove trailing " - Source Name" if present
        clean = re.sub(r"\s+-\s+[^-]+$", "", clean)
        return clean.strip()

    @staticmethod
    def _parse_pub_date(pub_date_str: str):
        """Parses RFC-822 date string from RSS metadata into a timezone-aware datetime."""
        if not pub_date_str:
            return None
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(pub_date_str)
        except Exception:
            return None

    @staticmethod
    def _calculate_relative_time(dt) -> str:
        """Calculates human-readable relative time from a datetime object."""
        if not dt:
            return "Today"
        try:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            diff_seconds = int((now - dt).total_seconds())
            if diff_seconds < 60:
                return "Just now"
            if diff_seconds < 3600:
                mins = max(1, diff_seconds // 60)
                return f"{mins}m ago"
            if diff_seconds < 86400:
                hrs = max(1, diff_seconds // 3600)
                return f"{hrs}h ago"
            days = max(1, diff_seconds // 86400)
            return f"{days}d ago"
        except Exception:
            return "Today"

    def get_weather_news(self, city: str = "Kanpur", state: str = "Uttar Pradesh", limit: int = 5) -> List[Dict[str, Any]]:
        clean_city = (city or "Kanpur").strip()
        clean_state = (state or "Uttar Pradesh").strip()
        cache_key = f"{clean_city.lower()}_{clean_state.lower()}"
        now_ts = time.time()

        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if entry["expires_at"] > now_ts:
                return entry["articles"][:limit]

        articles: List[Dict[str, Any]] = []

        try:
            query = f"{clean_city} weather OR {clean_city} rain OR {clean_state} monsoon rainfall OR India weather IMD"
            encoded_query = urllib.parse.quote(query)
            rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

            req = urllib.request.Request(
                rss_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) R.A.I. Weather Intelligence Feed/1.0",
                    "Accept": "application/rss+xml, application/xml, text/xml"
                }
            )

            with urllib.request.urlopen(req, timeout=6) as resp:
                xml_data = resp.read()
                root = ET.fromstring(xml_data)
                items = root.findall(".//item")

                from datetime import datetime, timezone
                now_utc = datetime.now(timezone.utc)
                seen_fingerprints = set()

                for item in items:
                    raw_title = item.find("title").text if item.find("title") is not None else ""
                    if not raw_title:
                        continue

                    title = self._clean_title(raw_title)
                    if not title or len(title) < 10:
                        continue

                    # Deduplication fingerprint
                    fingerprint = re.sub(r"[^a-z0-9]", "", title.lower())
                    if not fingerprint or fingerprint in seen_fingerprints:
                        continue

                    link_el = item.find("link")
                    link_url = link_el.text.strip() if link_el is not None and link_el.text else ""
                    if not link_url or link_url == "#":
                        continue

                    source_el = item.find("source")
                    source_name = source_el.text.strip() if source_el is not None and source_el.text else "Regional Weather Desk"

                    pub_date_el = item.find("pubDate")
                    pub_date_str = pub_date_el.text.strip() if pub_date_el is not None and pub_date_el.text else ""
                    
                    dt = self._parse_pub_date(pub_date_str)
                    # STRICT FRESHNESS: Accept articles within the past 24 hours (Today)
                    if dt is not None:
                        age_seconds = (now_utc - dt).total_seconds()
                        if age_seconds > 24 * 3600 or age_seconds < -300:
                            # Skip stale articles older than 24h
                            continue
                        pub_timestamp = dt.timestamp()
                    else:
                        pub_timestamp = now_ts

                    rel_time = self._calculate_relative_time(dt)

                    # Categorize weather urgency
                    title_lower = title.lower()
                    if any(w in title_lower for w in ["alert", "heavy rain", "flood", "warning", "cloudburst", "inundation"]):
                        category = "WEATHER_ALERT"
                    elif any(w in title_lower for w in ["monsoon", "forecast", "cloudy", "temperature", "shower", "thunderstorm"]):
                        category = "MONSOON_UPDATE"
                    else:
                        category = "METEOROLOGY"

                    seen_fingerprints.add(fingerprint)
                    articles.append({
                        "title": title,
                        "source": source_name,
                        "url": link_url,
                        "pubDate": pub_date_str,
                        "timestamp": pub_timestamp,
                        "relativeTime": rel_time,
                        "category": category,
                        "city": clean_city,
                        "region": clean_state
                    })

                    if len(articles) >= 12:
                        break

            # Sort strictly from newest -> oldest
            articles.sort(key=lambda a: a.get("timestamp", 0), reverse=True)

        except Exception:
            # When feed is temporarily unreachable, do not invent fake news
            articles = []

        self._cache[cache_key] = {
            "articles": articles,
            "expires_at": now_ts + NEWS_CACHE_TTL_SECONDS
        }

        return articles[:limit]

news_service = RaiNewsService.get_instance()
