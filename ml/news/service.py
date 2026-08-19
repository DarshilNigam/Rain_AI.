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
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List, Dict, Any, Optional

NEWS_CACHE_TTL_SECONDS = 10 * 60  # 10 minutes cache
MAX_ARTICLE_AGE_SECONDS = 24 * 3600  # Strict 24 hours (86,400 seconds)
CLOCK_SKEW_TOLERANCE_SECONDS = 300  # 5 minutes future tolerance

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
        if not raw_title:
            return ""
        clean = html.unescape(raw_title.strip())
        # Remove trailing " - Source Name" if present
        clean = re.sub(r"\s+-\s+[^-]+$", "", clean)
        return clean.strip()

    @staticmethod
    def _parse_pub_date(pub_date_str: str) -> Optional[datetime]:
        """
        Parses RFC-822, RFC-2822, or ISO-8601 publication date string
        into a timezone-aware UTC datetime.
        Returns None if missing or unparseable.
        """
        if not pub_date_str or not isinstance(pub_date_str, str):
            return None
        pub_str = pub_date_str.strip()
        if not pub_str:
            return None

        # 1. Try RFC-2822 / RFC-822 (Standard RSS pubDate)
        try:
            dt = parsedate_to_datetime(pub_str)
            if dt is not None:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
        except Exception:
            pass

        # 2. Try ISO-8601 / Atom formats
        try:
            clean_iso = pub_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_iso)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            pass

        return None

    @staticmethod
    def _calculate_relative_time(dt: Optional[datetime], now_utc: Optional[datetime] = None) -> Optional[str]:
        """
        Calculates human-readable relative time strictly within the 24-hour window.
        Returns None if dt is older than 24 hours.
        """
        if dt is None:
            return None
        if now_utc is None:
            now_utc = datetime.now(timezone.utc)

        diff_seconds = int((now_utc - dt).total_seconds())

        # Discard articles older than 24 hours (86,400s) or future clock skew > 5m
        if diff_seconds > MAX_ARTICLE_AGE_SECONDS or diff_seconds < -CLOCK_SKEW_TOLERANCE_SECONDS:
            return None

        if diff_seconds < 60:
            return "Just now"
        if diff_seconds < 3600:
            mins = max(1, diff_seconds // 60)
            return f"{mins}m ago"
        hrs = max(1, diff_seconds // 3600)
        return f"{hrs}h ago"

    def parse_rss_items(
        self,
        xml_data: bytes,
        clean_city: str,
        clean_state: str,
        now_utc: datetime
    ) -> List[Dict[str, Any]]:
        """
        Parses XML elements from RSS feed, validates timestamps,
        filters strictly for <= 24h, deduplicates, and sorts newest first.
        """
        try:
            root = ET.fromstring(xml_data)
        except Exception:
            return []

        items = root.findall(".//item")
        candidates_by_fingerprint: Dict[str, Dict[str, Any]] = {}

        for item in items:
            raw_title = item.find("title").text if item.find("title") is not None else ""
            title = self._clean_title(raw_title)
            if not title or len(title) < 10:
                continue

            link_el = item.find("link")
            link_url = link_el.text.strip() if link_el is not None and link_el.text else ""
            if not link_url or link_url == "#":
                continue

            source_el = item.find("source")
            source_name = source_el.text.strip() if source_el is not None and source_el.text else "Regional Weather Desk"

            # Check pubDate, published, updated, dc:date
            pub_date_str = ""
            for tag_name in ["pubDate", "published", "updated", "{http://purl.org/dc/elements/1.1/}date"]:
                el = item.find(tag_name)
                if el is not None and el.text:
                    pub_date_str = el.text.strip()
                    break

            if not pub_date_str:
                # REJECT: Missing publication timestamp
                continue

            dt = self._parse_pub_date(pub_date_str)
            if dt is None:
                # REJECT: Invalid/unparseable timestamp
                continue

            age_seconds = (now_utc - dt).total_seconds()

            # REJECT: Older than 24 hours or excessively in the future
            if age_seconds > MAX_ARTICLE_AGE_SECONDS or age_seconds < -CLOCK_SKEW_TOLERANCE_SECONDS:
                continue

            rel_time = self._calculate_relative_time(dt, now_utc)
            if not rel_time:
                continue

            pub_timestamp = dt.timestamp()

            # Categorize weather urgency
            title_lower = title.lower()
            if any(w in title_lower for w in ["alert", "heavy rain", "flood", "warning", "cloudburst", "inundation", "cyclone"]):
                category = "WEATHER_ALERT"
            elif any(w in title_lower for w in ["monsoon", "forecast", "cloudy", "temperature", "shower", "thunderstorm", "rain"]):
                category = "MONSOON_UPDATE"
            else:
                category = "METEOROLOGY"

            # Deduplication: Key on normalized alphanumeric title
            fingerprint = re.sub(r"[^a-z0-9]", "", title.lower())
            if not fingerprint:
                continue

            candidate = {
                "title": title,
                "source": source_name,
                "url": link_url,
                "pubDate": pub_date_str,
                "timestamp": pub_timestamp,
                "relativeTime": rel_time,
                "category": category,
                "city": clean_city,
                "region": clean_state,
                "age_seconds": age_seconds
            }

            # If duplicate exists, keep the newest version
            if fingerprint in candidates_by_fingerprint:
                if candidate["timestamp"] > candidates_by_fingerprint[fingerprint]["timestamp"]:
                    candidates_by_fingerprint[fingerprint] = candidate
            else:
                candidates_by_fingerprint[fingerprint] = candidate

        articles = list(candidates_by_fingerprint.values())
        # Sort strictly from newest -> oldest (highest timestamp first)
        articles.sort(key=lambda a: a["timestamp"], reverse=True)
        return articles

    def get_weather_news(
        self,
        city: str = "Kanpur",
        state: str = "Uttar Pradesh",
        limit: int = 5,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieves live weather headlines strictly published within the last 24 hours.
        Applies caching, real-time post-cache filtering, and returns empty list if no fresh news exists.
        """
        clean_city = (city or "Kanpur").strip()
        clean_state = (state or "Uttar Pradesh").strip()
        cache_key = f"{clean_city.lower()}_{clean_state.lower()}"
        now_utc = datetime.now(timezone.utc)
        now_ts = now_utc.timestamp()

        # Check Cache
        if not force_refresh and cache_key in self._cache:
            entry = self._cache[cache_key]
            if entry["expires_at"] > now_ts:
                # Post-cache freshness filter: ensure cached items haven't crossed the 24h boundary
                valid_cached = []
                for art in entry["articles"]:
                    art_dt = self._parse_pub_date(art.get("pubDate", ""))
                    if art_dt is not None:
                        age = (now_utc - art_dt).total_seconds()
                        if 0 <= age <= MAX_ARTICLE_AGE_SECONDS:
                            art["relativeTime"] = self._calculate_relative_time(art_dt, now_utc)
                            valid_cached.append(art)
                if valid_cached:
                    return valid_cached[:limit]

        articles: List[Dict[str, Any]] = []

        try:
            # Contextual Multi-term Query (City + State + Synoptic Monsoon Alert)
            query = f"{clean_city} weather OR {clean_city} rain OR {clean_state} monsoon rainfall OR IMD weather warning India"
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
                articles = self.parse_rss_items(xml_data, clean_city, clean_state, now_utc)

        except Exception:
            articles = []

        # Update cache with valid articles
        self._cache[cache_key] = {
            "articles": articles,
            "expires_at": now_ts + NEWS_CACHE_TTL_SECONDS
        }

        return articles[:limit]

news_service = RaiNewsService.get_instance()
