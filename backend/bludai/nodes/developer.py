"""Developer node implementation delegating to unified dynamic worker."""
from bludai.nodes.worker import make_worker_node

developer_node = make_worker_node("developer")
