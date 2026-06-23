import requests
from bs4 import BeautifulSoup
import json
from urllib.parse import urljoin

url = "https://rotarytrivandrumamity.com/"
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    images = []
    for img in soup.find_all('img'):
        src = img.get('src')
        if src:
            images.append(urljoin(url, src))
            
    videos = []
    for vid in soup.find_all('video'):
        src = vid.get('src')
        if src:
            videos.append(urljoin(url, src))
            
    for iframe in soup.find_all('iframe'):
        src = iframe.get('src')
        if src and ('youtube' in src or 'vimeo' in src):
            videos.append(urljoin(url, src))
            
    result = {"images": list(set(images)), "videos": list(set(videos))}
    with open('media_grab.json', 'w') as f:
        json.dump(result, f, indent=2)
    print(f"Found {len(result['images'])} images and {len(result['videos'])} videos.")
except Exception as e:
    print("Error:", e)
