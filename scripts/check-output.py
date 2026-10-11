from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist'
arguments = argparse.ArgumentParser()
arguments.add_argument('--base-path', default='/', help='Pages URL path, for example /FastAPI/')
args = arguments.parse_args()
base_path = '/' + args.base_path.strip('/') + '/' if args.base_path.strip('/') else '/'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])

broken = []
for path in OUTPUT.rglob('*.html'):
    parser = Links()
    parser.feed(path.read_text(encoding='utf-8'))
    for href in parser.links:
        url = urlsplit(href)
        if url.scheme or url.netloc or not url.path:
            continue
        local_path = unquote(url.path)
        if local_path.startswith('/'):
            if base_path != '/' and local_path.startswith(base_path):
                local_path = local_path[len(base_path):]
            elif base_path != '/' and local_path.rstrip('/') == base_path.rstrip('/'):
                local_path = 'index.html'
            target = OUTPUT / local_path.lstrip('/')
        else:
            target = path.parent / local_path
        options = [target, Path(str(target) + '.html'), target / 'index.html']
        if not any(candidate.is_file() for candidate in options):
            broken.append({'file': str(path.relative_to(OUTPUT)), 'href': href})

manifest = json.loads((OUTPUT / 'static/book-manifest.json').read_text(encoding='utf-8'))
assert len(manifest['chapters']) == 30
assert all((OUTPUT / (item['href'] + '.html')).is_file() for item in manifest['chapters'])
assert (OUTPUT / 'downloads/fastapi-book.zip').is_file()
assert (OUTPUT / 'downloads/knowledge-hub-project.zip').is_file()
print(json.dumps({'chapters':len(manifest['chapters']), 'html_pages':len(list(OUTPUT.rglob('*.html'))), 'broken_links':broken}, ensure_ascii=False, indent=2))
assert not broken, 'generated HTML contains unresolved local links'
