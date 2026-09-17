import sys, asyncio
sys.path.insert(0, '.')
from bludai.core.graph import app

async def run():
    try:
        async for chunk in app.astream({"messages": []}, config={"configurable":{"thread_id":"123"}}, stream_mode=["messages", "updates"]):
            pass
        print("Success")
    except Exception as e:
        print("Error:", e)

asyncio.run(run())
