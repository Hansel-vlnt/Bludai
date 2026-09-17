import sys
sys.path.insert(0, '.')
from bludai.core.graph import app

def run():
    try:
        # stream_mode=["messages", "updates"]
        for chunk in app.stream({"messages": [], "next": "Supervisor", "checklist": ""}, config={"configurable":{"thread_id":"123"}}, stream_mode=["messages", "updates"]):
            print(chunk[0])
            break
        print("Success")
    except Exception as e:
        print("Error:", e)

run()
