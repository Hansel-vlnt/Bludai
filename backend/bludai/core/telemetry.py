import json
import os
import time
from typing import Any, Dict, Optional

LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs', 'semantic_traces.jsonl')

def emit_semantic_event(
    thread_id: str,
    event_type: str,
    node: str,
    content: Any,
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        event = {
            'timestamp': time.time(),
            'thread_id': thread_id,
            'event_type': event_type,
            'node': node,
            'content': content,
            'metadata': metadata or {}
        }
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event) + '\n')
    except Exception as e:
        print(f'[Telemetry Error]: Failed to emit event - {e}')
