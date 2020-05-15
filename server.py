import asyncio
import json
import random

from pathlib import Path

from aiohttp import web

BIND = '127.0.0.1'
PORT = 8666

SCRIPT = Path('client.js').read_text()

INDEX_HTML = f'''\
<!doctype html>
<style type="text/css">
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;700&display=swap');
html{{background:#333;color:white;}}body{{display:flex;justify-content:center;font-size:16px;font-family:'Roboto',sans-serif}}*{{box-sizing:border-box}}
</style>
<script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
<script crossorigin src="https://unpkg.com/react@16/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js"></script>
<script crossorigin src="//unpkg.com/react-is/umd/react-is.production.min.js"></script>
<script crossorigin src="//unpkg.com/styled-components/dist/styled-components.min.js"></script>
<script type="text/babel">
(function(){{
{SCRIPT}
}})();
</script>
<meta charset="utf-8"><body><div id="root"></div>
'''

STATE = 'initial'
CURRENT_SUBJECT = '(unconfigured)'
PARTICIPANTS = set()
PENDING_RESULTS = {}
RESULTS = []
HISTOGRAM = None # or [<int>] * 6

CONNECTIONS = []


def flush():
    global PENDING_RESULTS
    global RESULTS
    global STATE
    global HISTOGRAM
    items = [item['text'] for item in PENDING_RESULTS.values() if item['text'].strip()]
    random.shuffle(items)
    HISTOGRAM = [0] * 6 # 0..5
    for item in PENDING_RESULTS.values():
        if item['note'] is not None:
            HISTOGRAM[item['note']] += 1
    if HISTOGRAM == [0] * 6:
        HISTOGRAM = None
    PENDING_RESULTS = {}
    RESULTS = items
    STATE = 'review'


async def broadcast(data):
    msg = json.dumps(data)
    for resp, done in CONNECTIONS:
        try:
            await resp.write(f'data: {msg}\n\n'.encode())
        except Exception:
            done.set_result(True)


async def push_state(target=None, extra={}):
    data = {
        'state': STATE,
        'subject': CURRENT_SUBJECT,
        'pending': {
            'received': len(PENDING_RESULTS),
            'expected': len(PARTICIPANTS),
        },
        'results': {
            'subject': CURRENT_SUBJECT,
            'items': RESULTS,
            'histogram': HISTOGRAM
        },
        **extra,
    }
    if target is None:
        await broadcast(data)
    else:
        msg = json.dumps(data)
        await target.write(f'data: {msg}\n\n'.encode())


async def handler(request):
    return web.Response(text=INDEX_HTML, content_type='text/html')


async def api_handler(request):
    global CURRENT_SUBJECT
    global PENDING_RESULTS
    global STATE
    call = await request.json()
    action = call.get('action')
    extra = {}
    if action == 'declare-key':
        PARTICIPANTS.add(call['key'])
    elif action == 'new-poll':
        CURRENT_SUBJECT = call['subject']
        PENDING_RESULTS = {}
        STATE = 'feedback'
        extra['reset'] = True
    elif action == 'post-feedback':
        PENDING_RESULTS[call['key']] = {
            'text': call['text'],
            'note': call['note']
        }
        if len(PENDING_RESULTS) == len(PARTICIPANTS):
            flush()
    elif action == 'force-results':
        flush()
    await push_state(extra=extra)
    data = {'success': True}
    return web.Response(text=json.dumps(data), content_type='application/json')


async def event_handler(request):
    response = web.StreamResponse()
    response.content_type = 'text/event-stream'
    await response.prepare(request)
    done = asyncio.Future()
    CONNECTIONS.append((response, done))
    await push_state(target=response)
    try:
        await done
    finally:
        CONNECTIONS[:] = filter(lambda item: item[0] is not response, CONNECTIONS)


async def run(app):
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, BIND, PORT)
    await site.start()


def main():
    app = web.Application()
    app.add_routes([
        web.get('/', handler),
        web.get('/event', event_handler),
        web.post('/api', api_handler),
    ])
    loop = asyncio.get_event_loop()
    loop.create_task(run(app))
    loop.run_forever()