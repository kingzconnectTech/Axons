import os
import json
import boto3
import time

class LocalPersistentQueue:
    def __init__(self, file_path):
        self.file_path = file_path
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as f:
                json.dump([], f)

    def put(self, item):
        # Very simple file-based queue
        try:
            # Use a basic retry loop for simple file locking
            for _ in range(5):
                try:
                    data = []
                    if os.path.exists(self.file_path):
                        with open(self.file_path, 'r') as f:
                            data = json.load(f)
                    data.append(item)
                    with open(self.file_path, 'w') as f:
                        json.dump(data, f)
                    return
                except (IOError, json.JSONDecodeError):
                    time.sleep(0.1)
        except Exception as e:
            print(f"[LocalQueue] Put error: {e}")

    def get(self, block=True):
        while True:
            try:
                data = []
                if os.path.exists(self.file_path):
                    with open(self.file_path, 'r+') as f:
                        try:
                            # Basic attempt at "atomic" read-and-clear
                            data = json.load(f)
                            if data:
                                item = data.pop(0)
                                f.seek(0)
                                f.truncate()
                                json.dump(data, f)
                                return item
                        except json.JSONDecodeError:
                            pass
                
                if not block:
                    return None
                time.sleep(1) # Poll every second
            except Exception as e:
                print(f"[LocalQueue] Get error: {e}")
                time.sleep(1)

    def qsize(self):
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, 'r') as f:
                    return len(json.load(f))
        except:
            pass
        return 0

class QueueService:
    def __init__(self):
        self.queue_url = os.environ.get("AXON_QUEUE_URL") or os.environ.get("AXON_SQS_QUEUE_URL")
        self.region = os.environ.get("QUEUE_REGION") or os.environ.get("AWS_REGION", "us-east-1")
        if self.queue_url:
            self.sqs = boto3.client("sqs", region_name=self.region)
            self.local_mode = False
        else:
            # Use absolute path for local queue file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            queue_file = os.path.join(base_dir, "local_queue.json")
            self.local_queue = LocalPersistentQueue(queue_file)
            self.local_mode = True
            print(f"[QueueService] Running in local PERSISTENT queue mode: {queue_file}")

    def _log(self, msg):
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            log_file = os.path.join(base_dir, "debug_queue.log")
            with open(log_file, "a") as f:
                f.write(f"[{os.getpid()}] {msg}\n")
        except:
            pass

    def enqueue_start(self, config_dict):
        if self.local_mode:
            self._log(f"Enqueue START. Queue file: {self.local_queue.file_path}")
            self.local_queue.put({
                "type": "start",
                "payload": config_dict
            })
            print(f"[QueueService] Enqueued START task locally. Queue size: {self.local_queue.qsize()}")
            return

        body = {
            "type": "start",
            "payload": config_dict
        }
        self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(body)
        )

    def enqueue_stop(self, email):
        if self.local_mode:
            self.local_queue.put({
                "type": "stop",
                "payload": {"email": email}
            })
            print(f"[QueueService] Enqueued STOP task locally. Queue size: {self.local_queue.qsize()}")
            return

        body = {
            "type": "stop",
            "payload": {"email": email}
        }
        self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(body)
        )

queue_service = QueueService()
