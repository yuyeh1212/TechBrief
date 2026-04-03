import httpx
import feedparser
from typing import List, Dict

YOUTUBE_SOURCES = [
    {
        "channel_name": "泛科學院",
        "channel_id": "UCuHHKbwC0TWjeqxbqdO-N_g",
    },
    {
        "channel_name": "三師爸 Sense Bar",
        "channel_id": "UCI2YklLazU9tB_Kh_9nMpKA",
    },
]


async def fetch_youtube_videos(channel_id: str, max_results: int = 5) -> List[Dict]:
    """從 YouTube RSS 抓取最新影片清單"""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            feed = feedparser.parse(resp.text)
            videos = []
            for entry in feed.entries[:max_results]:
                video_id = entry.get("yt_videoid", "")
                if not video_id:
                    continue
                videos.append({
                    "video_id": video_id,
                    "title": entry.get("title", "").strip(),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                })
            return videos
    except Exception as e:
        print(f"[YouTube] 抓取失敗 {channel_id}: {e}")
        return []


async def fetch_transcript(video_id: str) -> str | None:
    """抓取影片字幕"""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.get_transcript(
            video_id, languages=["zh-TW", "zh-Hans", "zh", "en"]
        )
        text = " ".join([t["text"] for t in transcript_list])
        return text[:4000]
    except Exception as e:
        print(f"[YouTube] 字幕抓取失敗 {video_id}: {e}")
        return None