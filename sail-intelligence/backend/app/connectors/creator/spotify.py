"""
app/connectors/creator/spotify.py

Full-stack Spotify creator / playlist intelligence connector.

Two Apify actors selected by query prefix:
  ARTIST   actor — maxcopell/spotify-scraper          (default)
  PLAYLIST actor — maxcopell/spotify-playlist-scraper  (queries starting with "PLAYLIST:")

Rich transform step computes for artist records:
  - streaming_velocity      ("high" / "medium" / "low" based on monthly listeners)
  - editorial_playlist_count (count of top-track names containing "editorial")
  - sync_opportunity_score   (popularity × 0.8 + genre diversity bonus × 0.2)
  - market_heat              ("hot" / "warm" / "emerging" based on monthly listeners)

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback: none (unique creator data source, no equivalent alternative)
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger   = structlog.get_logger(__name__)
settings = get_settings()


def _detect_mode(queries: list[str]) -> tuple[str, list[str]]:
    """
    Detect fetch mode from query prefixes.

    Rules:
      - "PLAYLIST:<url>" → playlist mode (strip "PLAYLIST:" prefix)
      - else             → artist search mode

    Returns:
        (mode, cleaned_queries)
    """
    if not queries:
        return "artist", queries

    if queries[0].upper().startswith("PLAYLIST:"):
        return "playlist", [q[len("PLAYLIST:"):].strip() for q in queries]
    return "artist", queries


def _streaming_velocity(monthly_listeners: int | None) -> str:
    """
    Classify an artist's streaming momentum into broad velocity bands.

    Thresholds:
      high   — > 1 000 000 monthly listeners
      medium — > 100 000 monthly listeners
      low    — ≤ 100 000 monthly listeners
    """
    if not monthly_listeners:
        return "low"
    if monthly_listeners > 1_000_000:
        return "high"
    if monthly_listeners > 100_000:
        return "medium"
    return "low"


def _sync_opportunity_score(popularity: int | None, genres: list[str]) -> float:
    """
    Estimate sync licensing opportunity on a 0.0–1.0 scale.

    Artists with broad popularity and narrow genre focus are easier to pitch
    to sync supervisors because their sound is immediately identifiable.

    Formula:
      score = (popularity / 100) × 0.8  +  genre_bonus × 0.2

    Where:
      genre_bonus = 1.0 if artist has fewer than 3 genres (focused sound)
                    0.5 otherwise (broader, harder to pitch)

    Args:
        popularity: Spotify popularity score 0–100.
        genres:     List of genre strings from Spotify.

    Returns:
        Float in [0.0, 1.0] rounded to 4 decimal places.
    """
    pop_score    = ((popularity or 0) / 100) * 0.8
    genre_bonus  = 1.0 if len(genres) < 3 else 0.5
    return round(pop_score + genre_bonus * 0.2, 4)


def _market_heat(monthly_listeners: int | None) -> str:
    """
    Classify the market heat for an artist based on streaming scale.

    Thresholds:
      hot      — > 5 000 000 monthly listeners
      warm     — > 500 000 monthly listeners
      emerging — ≤ 500 000 monthly listeners
    """
    if not monthly_listeners:
        return "emerging"
    if monthly_listeners > 5_000_000:
        return "hot"
    if monthly_listeners > 500_000:
        return "warm"
    return "emerging"


def _editorial_playlist_count(top_track_names: list[str]) -> int:
    """
    Count how many of an artist's top tracks appear to be on editorial playlists.

    Heuristic: checks whether the string "editorial" appears in any track name
    or associated metadata string. This is a proxy — a full implementation
    would cross-reference the Spotify playlist catalogue.

    Args:
        top_track_names: List of track name strings (up to 5 from Apify output).

    Returns:
        Integer count of tracks with "editorial" in their name.
    """
    return sum(1 for name in top_track_names if "editorial" in name.lower())


class SpotifyConnector(AbstractDataConnector):
    """
    Spotify creator and playlist intelligence connector.

    Routes to two actors:
      - Artist search: returns popularity, follower, genre, and listener data.
      - Playlist fetch: returns track-level metadata for specific playlist URLs.

    The transform step enriches artist records with streaming velocity
    classification, sync licensing scores, and market heat signals useful
    for A&R, brand partnership, and media buying decisions.
    """

    meta = ConnectorMeta(
        connector_id="spotify-creator",
        domain="creator",
        rate_limit_rpm=500,
        fallback_ids=[],
    )

    APIFY_ACTOR_ARTIST   = "maxcopell/spotify-scraper"
    APIFY_ACTOR_PLAYLIST = "maxcopell/spotify-playlist-scraper"
    APIFY_RUN_URL        = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL    = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    # ── Public entry point ────────────────────────────────────────────────────

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Detect mode, select the correct Apify actor, and fetch results.

        Args:
            queries: Search terms for artist mode, or "PLAYLIST:<url>" strings
                     for playlist mode.

        Returns:
            Raw item dicts from the Apify dataset, tagged with "_mode".
        """
        mode, cleaned = _detect_mode(queries)
        return await self._fetch_with_resilience(cleaned, mode)

    # ── Resilience-wrapped internal fetcher ───────────────────────────────────

    @with_resilience(
        connector_id="spotify-creator",
        max_attempts=10,
        base_wait_secs=1.0,
        max_wait_secs=120.0,
    )
    async def _fetch_with_resilience(
        self,
        queries: list[str],
        mode: str = "artist",
    ) -> list[dict[str, Any]]:
        """
        Build actor-specific input, POST the run, GET the dataset items.

        Args:
            queries: Cleaned queries (mode prefix already stripped).
            mode:    "artist" or "playlist".

        Returns:
            Parsed JSON list of raw item dicts.

        Raises:
            ConnectorRateLimitError: HTTP 429 from Apify.
            ConnectorError:          Non-success actor launch response.
            ConnectorTimeoutError:   Non-success dataset fetch response.
        """
        if mode == "playlist":
            actor = self.APIFY_ACTOR_PLAYLIST
            actor_input: dict[str, Any] = {
                "playlistUrls": queries,
                "maxTracks":    5000,
            }
        else:
            actor = self.APIFY_ACTOR_ARTIST
            actor_input = {
                "searchQueries": queries,
                "searchType":    "artists",
                "maxResults":    500,
                "proxyConfiguration": {
                    "useApifyProxy": True,
                },
            }

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            # ── Step 1: Launch actor ────────────────────────────────────────
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=actor),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                json={"input": actor_input},
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message=f"Apify rate limit hit for Spotify {mode} actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=(
                        f"Apify Spotify {mode} actor launch failed: "
                        f"HTTP {run_resp.status_code}"
                    ),
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message=f"Apify Spotify {mode} response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset ───────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=(
                        f"Apify Spotify {mode} dataset fetch failed: "
                        f"HTTP {dataset_resp.status_code}"
                    ),
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            for item in items:
                item["_mode"] = mode

            logger.info(
                "spotify_fetch_done",
                mode=mode,
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Enrich Spotify artist and playlist records with computed intelligence signals.

        Artist records gain:
          - streaming_velocity      — high / medium / low
          - editorial_playlist_count — count of top tracks with editorial mentions
          - sync_opportunity_score  — 0.0–1.0 licensing attractiveness score
          - market_heat             — hot / warm / emerging

        Playlist records are passed through with track-level metadata.
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            mode = item.get("_mode", "artist")

            if mode == "playlist":
                # ── Playlist track record ────────────────────────────────────
                track_artists = item.get("artists", [])
                artist_names  = (
                    [a.get("name", "") for a in track_artists]
                    if isinstance(track_artists, list)
                    else []
                )
                remapped.append({
                    "artist_id":    item.get("id", ""),
                    "artist_name":  ", ".join(filter(None, artist_names)),
                    "profile_url":  item.get("externalUrls", {}).get("spotify", "")
                                    if isinstance(item.get("externalUrls"), dict)
                                    else "",
                    "track_name":   item.get("name", ""),
                    "album_name":   item.get("albumName") or (
                        item.get("album", {}).get("name", "")
                        if isinstance(item.get("album"), dict)
                        else ""
                    ),
                    "popularity":   item.get("popularity"),
                    "duration_ms":  item.get("durationMs"),
                    "explicit":     item.get("explicit", False),
                    "preview_url":  item.get("previewUrl", ""),
                    "image_url":    (
                        (item.get("album", {}).get("images") or [{}])[0].get("url", "")
                        if isinstance(item.get("album"), dict)
                        else ""
                    ),
                    "_mode":        "playlist",
                })

            else:
                # ── Artist record ────────────────────────────────────────────
                followers         = item.get("followers", {})
                follower_total    = (
                    followers.get("total")
                    if isinstance(followers, dict)
                    else followers
                )
                images            = item.get("images") or []
                image_url         = images[0].get("url", "") if images else ""
                external_url      = item.get("externalUrl") or item.get("external_urls", {})
                profile_url       = (
                    external_url.get("spotify", "")
                    if isinstance(external_url, dict)
                    else str(external_url)
                )
                genres: list[str] = item.get("genres") or []
                popularity: int   = item.get("popularity") or 0
                monthly_listeners = item.get("monthlyListeners") or item.get("monthly_listeners")

                # Top tracks — extract names, limit to 5
                raw_top_tracks    = item.get("topTracks") or item.get("top_tracks") or []
                top_track_names: list[str] = [
                    (t.get("name", "") if isinstance(t, dict) else str(t))
                    for t in raw_top_tracks[:5]
                ]

                # Related / similar artists
                related_raw       = item.get("relatedArtists") or item.get("related_artists") or []
                similar_artists: list[str] = [
                    (a.get("name", "") if isinstance(a, dict) else str(a))
                    for a in related_raw
                ]

                remapped.append({
                    # Core identity
                    "artist_id":               item.get("id", ""),
                    "artist_name":             item.get("name", ""),
                    "profile_url":             profile_url,
                    "country_code":            item.get("country") or item.get("country_code", ""),
                    # Streaming performance
                    "monthly_listeners":        monthly_listeners,
                    "followers":               follower_total,
                    "popularity":              popularity,
                    # Genre & catalogue
                    "genres":                  genres,
                    "top_tracks":              top_track_names,
                    "similar_artists":         similar_artists,
                    # Visual
                    "image_url":               image_url,
                    # Computed intelligence signals
                    "streaming_velocity":      _streaming_velocity(monthly_listeners),
                    "editorial_playlist_count": _editorial_playlist_count(top_track_names),
                    "sync_opportunity_score":  _sync_opportunity_score(popularity, genres),
                    "market_heat":             _market_heat(monthly_listeners),
                    "_mode":                   "artist",
                })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
