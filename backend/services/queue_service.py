import os
import json
import boto3
import queue

class QueueService:
    def __init__(self):
        self.queue_url = os.environ.get("AXON_SQS_QUEUE_URL")
        self.region = os.environ.get("AWS_REGION", "us-east-1")
        if self.queue_url:
            self.sqs = boto3.client("sqs", region_name=self.region)
            self.local_mode = False
        else:
            self.local_queue = queue.Queue()
            self.local_mode = True
            print("[QueueService] Running in LOCAL mode (Internal Queue).")

    def _log(self, msg):
        try:
            with open("debug_queue.log", "a") as f:
                f.write(f"[{os.getpid()}] {msg}\n")
        except:
            pass

    def enqueue_start(self, config_dict):
        if self.local_mode:
            self._log(f"Enqueue START. Queue ID: {id(self.local_queue)}")
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
