import os
import json
import time
import threading
import multiprocessing
import boto3
from models.schemas import AutoTradeConfig
from services.trade_worker import run_trade_session
from services.status_store import status_store
from services.notification_service import notification_service

class WorkerDaemon:
    def __init__(self, local_queue=None):
        self.region = os.environ.get("QUEUE_REGION") or os.environ.get("AWS_REGION", "us-east-1")
        self.queue_url = os.environ.get("AXON_QUEUE_URL") or os.environ.get("AXON_SQS_QUEUE_URL")
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

    def monitor_session(self, email, stats, stop_event, worker_thread):
        print(f"[WorkerDaemon] Monitor started for {email}")
        status_store._log(f"[WorkerDaemon] Monitor started for {email}")
        try:
            while True:
                # Check if thread died
                if not worker_thread.is_alive():
                    print(f"[WorkerDaemon] Trade for {email} has ended.")
                    stats["active"] = False
                    status_store.set_status(email, dict(stats))
                    break

                # Check heartbeat (zombie process detection)
                last_hb = stats.get("heartbeat", 0)
                if time.time() - last_hb > 600: # 10 minutes
                    print(f"[WorkerDaemon] Zombie process detected for {email} (no heartbeat for 10m). Terminating.")
                    try:
                        worker_thread.terminate()
                    except:
                        pass
                    stats["active"] = False
                    status_store.set_status(email, dict(stats))
                    break

                # Periodic stats update
                status_store.set_status(email, dict(stats))

                # Wait for 5 seconds or until stop signal
                if stop_event.wait(5):
                    print(f"[WorkerDaemon] Stop event set for {email}")
                    stats["active"] = False
                    status_store.set_status(email, dict(stats))
                    break
            
            # Send notification after loops break (session ended)
            self._send_finish_notification(email, stats)
            self.sessions.pop(email, None)

        except Exception as e:
            print(f"[WorkerDaemon] Monitor exception for {email}: {e}")
            self.sessions.pop(email, None)

    def start_session(self, config_dict):
        email = config_dict["email"]
        if email in self.sessions:
            if self.sessions[email]["thread"].is_alive():
                print(f"[WorkerDaemon] Session alive for {email}, skipping start.")
                return
            else:
                del self.sessions[email]

        # Use multiprocessing.Event to signal the separate process
        stop_event = multiprocessing.Event()
        
        # We MUST use a multiprocessing.Manager().dict() so that the separate 
        # process can update the stats and the monitor thread can read them!
        manager = multiprocessing.Manager()
        stats = manager.dict({
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "profit": 0.0,
            "consecutive_losses": 0,
            "balance": 0.0,
            "currency": None,
            "active": True,
            "heartbeat": time.time()
        })
        config = AutoTradeConfig(**config_dict)
        
        # Start trading process
        worker_process = multiprocessing.Process(target=run_trade_session, args=(config, stats, stop_event))
        worker_process.daemon = True
        worker_process.start()
        
        # Mark as active immediately
        status_store.set_status(email, dict(stats))

        # Start monitor thread in the daemon
        monitor = threading.Thread(target=self.monitor_session, args=(email, stats, stop_event, worker_process), daemon=True)
        monitor.start()
        
        self.sessions[email] = {
            "thread": worker_process, 
            "stop_event": stop_event, 
            "stats": stats,
            "manager": manager # MUST keep manager alive or the proxy dicts will break!
        }
        self._log(f"Started session process for {email}")

    def _send_finish_notification(self, email, stats):
        try:
            token = status_store.get_token(email)
            if not token:
                print(f"[WorkerDaemon] No FCM token found for {email}, skipping notification.")
                return

            # Ensure we are using fresh values from the manager dict
            total = stats.get("total_trades", 0)
            wins = stats.get("wins", 0)
            losses = stats.get("losses", 0)
            profit = stats.get("profit", 0.0)

            title = "Auto Trade Finished"
            body = (
                f"TOTAL: {total}\n"
                f"WINS: {wins}\n"
                f"LOSSES: {losses}\n"
                f"PROFIT: {profit:.2f}"
            )
            
            notification_service.send_multicast([token], title, body)
            print(f"[WorkerDaemon] Finish notification sent to {email}")
        except Exception as e:
            print(f"[WorkerDaemon] Error sending finish notification: {e}")

    def _log(self, msg):
        status_store._log(msg)

    def stop_session(self, email):
        if email in self.sessions:
            print(f"[WorkerDaemon] Stopping session for {email}")
            self.sessions[email]["stop_event"].set()
            # If the process hangs, we could forcibly terminate it after a timeout if we wanted
        else:
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
    if not os.environ.get("AXON_QUEUE_URL") and not os.environ.get("AXON_SQS_QUEUE_URL"):
        print("[WorkerDaemon] No SQS URL found. Defaulting to local persistent queue.")
        from services.queue_service import queue_service
        WorkerDaemon(local_queue=queue_service.local_queue).run()
    else:
        WorkerDaemon().run()
