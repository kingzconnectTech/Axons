import firebase_admin
from firebase_admin import credentials, messaging
import os
import logging
from typing import List, Dict

class NotificationService:
    _instance = None

    def __init__(self):
        self.initialized = False
        self._initialize_firebase()

    def _initialize_firebase(self):
        try:
            # Look for service account path in env or default location
            # Users should place the json file in backend/ or set the env var
            cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")
            
            if os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    # Check if app is already initialized to avoid ValueError
                    try:
                        firebase_admin.get_app()
                    except ValueError:
                        firebase_admin.initialize_app(cred)
                    
                    self.initialized = True
                    print(f"[NotificationService] Firebase Admin initialized successfully using {cred_path}.")
                except Exception as e:
                     print(f"[NotificationService] Critical Firebase Init Error: {e}")
            else:
                # Try to find it in the parent directory as a fallback (common in dev)
                parent_cred = os.path.join(os.path.dirname(os.getcwd()), cred_path)
                if os.path.exists(parent_cred):
                     try:
                        cred = credentials.Certificate(parent_cred)
                        try:
                            firebase_admin.get_app()
                        except ValueError:
                            firebase_admin.initialize_app(cred)
                        self.initialized = True
                        print(f"[NotificationService] Firebase Admin initialized using fallback path: {parent_cred}")
                     except Exception as e:
                        print(f"[NotificationService] Critical Firebase Init Error (Fallback): {e}")
                else:
                    print(f"[NotificationService] Service account key NOT FOUND at {cred_path} or {parent_cred}. Notifications DISABLED.")
                    # List files in current dir to help debug
                    print(f"[NotificationService] Current Directory: {os.getcwd()}")
                    print(f"[NotificationService] Files: {os.listdir(os.getcwd())}")
        except Exception as e:
            logging.error(f"[NotificationService] Failed to initialize Firebase: {e}")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def send_multicast(self, tokens: List[str], title: str, body: str, data: Dict = None):
        """
        Send a notification to multiple devices.
        """
        if not self.initialized:
            logging.warning("[NotificationService] Cannot send notification: Not initialized.")
            return
        
        if not tokens:
            logging.warning("[NotificationService] No tokens provided for notification.")
            return
        
        # Firebase Multicast supports up to 500 tokens at once
        # If we have more, we should chunk them (omitted for brevity unless needed)
        
        # Prepare data payload (include title/body in data for consistent handling)
        message_data = data or {}
        message_data["title"] = title
        message_data["body"] = body
        
        message = messaging.MulticastMessage(
            # Do NOT use the 'notification' field for Android background reliability
            # notification=messaging.Notification(title=title, body=body),
            data=message_data,
            tokens=tokens,
            android=messaging.AndroidConfig(
                priority='high',
                ttl=3600,
            ),
        )
        
        try:
            print(f"[NotificationService] Sending multicast to {len(tokens)} tokens...")
            response = messaging.send_multicast(message)
            print(f"[NotificationService] Sent {response.success_count} messages. Failed: {response.failure_count}")
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        print(f"[NotificationService] Failure details for token {idx}: {resp.exception}")
            return response
        except Exception as e:
            logging.error(f"[NotificationService] Send Error: {e}")
            return None

notification_service = NotificationService.get_instance()
