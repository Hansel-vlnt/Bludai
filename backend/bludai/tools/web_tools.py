import re
import requests
from urllib.parse import unquote
import base64
from typing import List, Dict, Any
from langchain_core.tools import tool

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

def _decode_bing_url(raw_url: str) -> str:
    """Attempts to decode Bing redirect u=a1... url to original destination."""
    try:
        if "u=a1" in raw_url:
            encoded = raw_url.split("u=a1")[1].split("&")[0]
            # Add base64 padding if needed
            missing_padding = len(encoded) % 4
            if missing_padding:
                encoded += '=' * (4 - missing_padding)
            decoded = base64.b64decode(encoded).decode('utf-8', errors='ignore')
            if decoded.startswith("http"):
                return decoded
    except Exception:
        pass
    return raw_url

def _search_bing(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    url = f"https://www.bing.com/search?q={requests.utils.quote(query)}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code != 200:
            return []
        html = r.text
        results = []
        items = re.findall(r'<li class="b_algo"[^>]*>(.*?)</li>', html, re.DOTALL)
        for item in items[:max_results]:
            title_match = re.search(r'<h2><a[^>]*href="([^"]+)"[^>]*>(.*?)</a></h2>', item, re.DOTALL)
            if not title_match:
                title_match = re.search(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', item, re.DOTALL)
            
            snippet_match = re.search(r'<p[^>]*class="b_lineclamp[^"]*"[^>]*>(.*?)</p>', item, re.DOTALL)
            if not snippet_match:
                snippet_match = re.search(r'<p[^>]*>(.*?)</p>', item, re.DOTALL)
                
            raw_url = title_match.group(1) if title_match else ""
            direct_url = _decode_bing_url(raw_url)
            
            raw_title = title_match.group(2) if title_match else ""
            title = re.sub(r'<[^>]+>', '', raw_title).strip()
            
            raw_snippet = snippet_match.group(1) if snippet_match else ""
            snippet = re.sub(r'<[^>]+>', '', raw_snippet).strip()
            
            if title and (snippet or direct_url):
                results.append({"title": title, "url": direct_url, "snippet": snippet})
        return results
    except Exception:
        return []

def _search_google(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    url = f"https://www.google.com/search?q={requests.utils.quote(query)}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code != 200:
            return []
        html = r.text
        results = []
        # Google search snippet cards
        snippets = re.findall(r'<div class="BNeawe s3v9rd AP7Wnd"[^>]*>(.*?)</div>', html, re.DOTALL)
        titles = re.findall(r'<div class="BNeawe vvjwJb AP7Wnd"[^>]*>(.*?)</div>', html, re.DOTALL)
        for i in range(min(len(titles), len(snippets), max_results)):
            t = re.sub(r'<[^>]+>', '', titles[i]).strip()
            s = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            if t and s:
                results.append({"title": t, "url": "https://www.google.com", "snippet": s})
        return results
    except Exception:
        return []

def _search_wikipedia(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={requests.utils.quote(query)}&limit={max_results}&namespace=0&format=json"
    try:
        r = requests.get(url, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            data = r.json()
            titles = data[1]
            snippets = data[2]
            urls = data[3]
            results = []
            for i in range(len(titles)):
                if snippets[i]:
                    results.append({"title": titles[i], "url": urls[i], "snippet": snippets[i]})
            return results
    except Exception:
        pass
    return []

@tool
def web_search(query: str) -> str:
    """
    Search the live internet in real-time for up-to-date information, news, API docs,
    releases, and current facts. Use this whenever the user asks for recent information,
    trending topics, or live web research.
    
    Args:
        query: The targeted search query string.
    """
    query = query.strip()
    if not query:
        return "Search query cannot be empty."

    results = _search_bing(query, max_results=5)
    if not results:
        results = _search_google(query, max_results=4)
    if not results:
        results = _search_wikipedia(query, max_results=3)

    if not results:
        return f"No live search results found for: '{query}'."

    output = [f"### Live Web Search Results for: '{query}'\n"]
    for idx, r in enumerate(results, 1):
        output.append(f"**[{idx}] {r['title']}**")
        if r.get("url"):
            output.append(f"Link: {r['url']}")
        output.append(f"Summary: {r['snippet']}\n")

    return "\n".join(output)
