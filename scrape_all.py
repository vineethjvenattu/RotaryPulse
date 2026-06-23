import urllib.request, re
html = urllib.request.urlopen('https://rotarytrivandrumamity.com/').read().decode('utf-8')
links = set(re.findall(r'href=[\'\"](https://rotarytrivandrumamity.com/[^\'\"]+/)[\'\"]', html))
links.add('https://rotarytrivandrumamity.com/')

all_images = set()
for url in links:
    try:
        page_html = urllib.request.urlopen(url).read().decode('utf-8')
        imgs = re.findall(r'https://rotarytrivandrumamity.com/wp-content/uploads/[^\"\']*?\.(?:jpg|jpeg|png)', page_html)
        for img in imgs: all_images.add(img)
    except:
        pass

# filter out small thumbnails, icons, shapes, css files
filtered = []
for img in all_images:
    if 'favicon' in img or 'shape' in img or 'elementor' in img or '150x150' in img: continue
    filtered.append(img)

print("Grabbed images:")
for f in filtered: print(f)

# Put them in api.js gallery
import json
with open('src/services/api.js', 'r') as f: content = f.read()
# We can replace MOCK_ALBUMS or just print it for me to use
with open('gallery.json', 'w') as f: json.dump(filtered, f)
