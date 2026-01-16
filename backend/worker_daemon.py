import os
import json
import time
import multiprocessing
import threading
import boto3
from models.schemas import AutoTradeConfig
from services.trade_worker import run_trade_session
from services.status_store import status_store

class WorkerDaemon:
    def __init__(self):
        self.region = os.environ.get("AWS_REGION", "us-east-1")
        self.queue_url = os.environ.get("AXON_SQS_QUEUE_URL")
        self.sqs = boto3.client("sqs", region_name=self.region)
        self.manager = multiprocessing.Manager()
        self.sessions = {}
        if not self.queue_url:
            raise RuntimeError("AXON_SQS_QUEUE_URL not set")

    def monitor_session(self, email, stats, stop_event):
        while True:
            data = dict(stats)
            # Use is_alive + active flag to determine true status
            data["active"] = not stop_event.is_set()
            status_store.set_status(email, data)
            
            # Wait for 5 seconds OR until stop_event is set
            if stop_event.wait(5):
                # If stopped, perform one last update to ensure active=False
                data = dict(stats)
                data["active"] = False
                status_store.set_status(email, data)
                break

    def start_session(self, config_dict):
        email = config_dict["email"]
        if email in self.sessions:
            proc = self.sessions[email]["process"]
            if proc.is_alive():
                return
            else:
                del self.sessions[email]
        stop_event = self.manager.Event()
        stats = self.manager.dict({
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "profit": 0.0,
            "consecutive_losses": 0,
            "balance": 0.0,
            "currency": None,
            "active": True
        })
        config = AutoTradeConfig(**config_dict)
        process = multiprocessing.Process(target=run_trade_session, args=(config, stats, stop_event))
        process.start()
        monitor = threading.Thread(target=self.monitor_session, args=(email, stats, stop_event), daemon=True)
        monitor.start()
        self.sessions[email] = {"process": process, "stop_event": stop_event, "stats": stats}

    def stop_session(self, email):
        if email in self.sessions:
            self.sessions[email]["stop_event"].set()

    def run(self):
        while True:
            resp = self.sqs.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=20
            )
            messages = resp.get("Messages", [])
            for m in messages:
                body = json.loads(m["Body"])
                t = body.get("type")
                payload = body.get("payload", {})
                if t == "start":
                    self.start_session(payload)
                elif t == "stop":
                    email = payload.get("email")
                    if email:
                        self.stop_session(email)
                self.sqs.delete_message(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=m["ReceiptHandle"]
                )

if __name__ == "__main__":
    WorkerDaemon().run()
