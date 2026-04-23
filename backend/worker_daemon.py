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
    def __init__(self, local_queue=None):
        self.region = os.environ.get("QUEUE_REGION") or os.environ.get("AWS_REGION", "us-east-1")
        self.queue_url = os.environ.get("AXON_QUEUE_URL") or os.environ.get("AXON_SQS_QUEUE_URL")
        self.manager = multiprocessing.Manager()
        self.sessions = {}
        
        if local_queue:
            self.local_queue = local_queue
            self.local_mode = True
            print("[WorkerDaemon] Started in LOCAL mode.")
        elif self.queue_url:
            self.sqs = boto3.client("sqs", region_name=self.region)
            self.local_mode = False
            print("[WorkerDaemon] Started in external queue mode.")
        else:
            raise RuntimeError("AXON_QUEUE_URL not set and no local_queue provided")

    def monitor_session(self, email, stats, stop_event, process):
        print(f"[WorkerDaemon] Monitor started for {email}")
        status_store._log(f"[WorkerDaemon] Monitor started for {email}")
        try:
            while True:
                # Check if process died (naturally or via stop_event)
                if not process.is_alive():
                    print(f"[WorkerDaemon] Process for {email} has ended.")
                    data = dict(stats)
                    data["active"] = False
                    status_store.set_status(email, data)
                    # Clean up sessions so a future 'start' command works correctly
                    self.sessions.pop(email, None)
                    break

                data = dict(stats)
                # Respect both the stop_event AND the worker's own active flag.
                # Never re-set active=True once a stop has been signalled.
                if stop_event.is_set() or not data.get("active", True):
                    data["active"] = False
                    status_store.set_status(email, data)
                    print(f"[WorkerDaemon] Stop confirmed for {email}, ending monitor.")
                    # Clean up sessions
                    self.sessions.pop(email, None)
                    break

                status_store.set_status(email, data)

                # Wait for 5 seconds OR until stop_event is set
                if stop_event.wait(5):
                    print(f"[WorkerDaemon] Stop event set for {email}")
                    # Perform one final update to guarantee active=False in the store
                    data = dict(stats)
                    data["active"] = False
                    status_store.set_status(email, data)
                    # Clean up sessions
                    self.sessions.pop(email, None)
                    break
        except Exception as e:
            print(f"[WorkerDaemon] Monitor exception for {email}: {e}")
            import traceback
            traceback.print_exc()
            self.sessions.pop(email, None)

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
        process.daemon = True  # Ensure process dies if main process (backend) restarts
        process.start()
        monitor = threading.Thread(target=self.monitor_session, args=(email, stats, stop_event, process), daemon=True)
        monitor.start()
        self._log(f"Started session for {email}. Process PID: {process.pid}")
        self.sessions[email] = {"process": process, "stop_event": stop_event, "stats": stats}

    def stop_session(self, email):
        if email in self.sessions:
            print(f"[WorkerDaemon] Stopping session for {email}")
            self.sessions[email]["stop_event"].set()
            # Do NOT delete from self.sessions here — the monitor_session thread
            # will clean up once the process has fully terminated, preventing a
            # race where a late 'start' task sees a dead process and relaunches.
        else:
            # Ghost session: no active session tracked, force-clear the store.
            print(f"[WorkerDaemon] clear ghost session for {email}")
            status_store.set_status(email, {"active": False})

    def run(self):
        status_store._log(f"[WorkerDaemon] Listening for tasks... LocalMode={self.local_mode}")
        print(f"[WorkerDaemon] Listening for tasks...")
        while True:
            if self.local_mode:
                try:
                    task = self.local_queue.get()
                    status_store._log(f"[WorkerDaemon] Received task: {task.get('type')}")
                    print(f"[WorkerDaemon] Received task: {task.get('type')}")
                    t = task.get("type")
                    payload = task.get("payload", {})
                    if t == "start":
                        self.start_session(payload)
                    elif t == "stop":
                        email = payload.get("email")
                        if email:
                            self.stop_session(email)
                except Exception as e:
                    status_store._log(f"[WorkerDaemon] Error in local loop: {e}")
                    print(f"[WorkerDaemon] Error in local loop: {e}")
                    import traceback
                    traceback.print_exc()
                    time.sleep(1)
            else:
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
