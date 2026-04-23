import os
import sys
import time

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from services.queue_service import queue_service

def test_queue():
    print("Testing Enqueue...")
    test_payload = {"email": "test@example.com", "strategy": "test"}
    queue_service.enqueue_start(test_payload)
    
    print(f"Queue Size: {queue_service.local_queue.qsize()}")
    
    print("Testing Dequeue...")
    task = queue_service.local_queue.get(block=False)
    print(f"Received Task: {task}")
    
    if task and task['payload']['email'] == "test@example.com":
        print("SUCCESS: Local persistence working!")
    else:
        print("FAILED: Task mismatch or not found.")

if __name__ == "__main__":
    test_queue()
