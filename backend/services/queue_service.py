import os
import json
import boto3

class QueueService:
    def __init__(self):
        self.queue_url = os.environ.get("AXON_SQS_QUEUE_URL")
        self.region = os.environ.get("AWS_REGION", "us-east-1")
        self.sqs = boto3.client("sqs", region_name=self.region)

    def enqueue_start(self, config_dict):
        if not self.queue_url:
            raise RuntimeError("AXON_SQS_QUEUE_URL not set")
        body = {
            "type": "start",
            "payload": config_dict
        }
        self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(body)
        )

    def enqueue_stop(self, email):
        if not self.queue_url:
            raise RuntimeError("AXON_SQS_QUEUE_URL not set")
        body = {
            "type": "stop",
            "payload": {"email": email}
        }
        self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(body)
        )

queue_service = QueueService()
