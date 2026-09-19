from datetime import datetime
from langchain_core.tools import tool

@tool
def get_current_time() -> str:
    """Returns the current system date and time in human-readable and ISO formats."""
    now = datetime.now()
    return f"Current Date and Time: {now.strftime('%A, %B %d, %Y %H:%M:%S')} (ISO: {now.isoformat()})"
