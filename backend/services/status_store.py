import os
import time
import json
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError
import logging

class StatusStore:
    def __init__(self):
        self.table_name = os.environ.get("AXON_STATUS_TABLE")
        self.region = os.environ.get("AWS_REGION", "us-east-1")
        
        # Use absolute path for local storage to avoid CWD issues
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.local_file = os.path.join(base_dir, "local_status_store.json")
        
        # Force local storage for debugging/dev if table name is empty or we want to ensure local
        # You can revert this later if DynamoDB is strictly required
        if not self.table_name or True: 
            print(f"[StatusStore] Using local JSON file storage at: {self.local_file}")
            self.use_local = True
            self._load_local()
            # Try creating file immediately to test permissions
            if not os.path.exists(self.local_file):
                print("[StatusStore] Creating empty local store file...")
                self._save_local()
            return

        self.use_local = False
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region)
        self.table = self.dynamodb.Table(self.table_name)
        self.partition_key = None
        try:
            key_schema = self.table.key_schema
            for key in key_schema:
                if key.get("KeyType") == "HASH":
                    self.partition_key = key.get("AttributeName")
                    break
        except ClientError as e:
            print(f"[StatusStore] Error describing table {self.table_name}: {e}")
        
        if not self.partition_key:
            print("[StatusStore] Warning: Partition key not found. Storage disabled.")
            self.table = None

    def _load_local(self):
        if os.path.exists(self.local_file):
            try:
                with open(self.local_file, 'r') as f:
                    self.local_data = json.load(f)
            except:
                self.local_data = {}
        else:
            self.local_data = {}

    def _save_local(self):
        try:
            abs_path = os.path.abspath(self.local_file)
            print(f"[StatusStore] Saving to {abs_path}")
            with open(self.local_file, 'w') as f:
                json.dump(self.local_data, f, indent=2)
        except Exception as e:
            print(f"[StatusStore] Failed to save local data: {e}")

    def _to_dynamodb_compatible(self, value):
        if isinstance(value, float):
            return Decimal(str(value))
        if isinstance(value, dict):
            return {k: self._to_dynamodb_compatible(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._to_dynamodb_compatible(v) for v in value]
        return value

    def set_status(self, email, status_dict):
        if self.use_local:
            if email not in self.local_data:
                self.local_data[email] = {}
            self.local_data[email].update(status_dict or {})
            self.local_data[email]["updated_at"] = int(time.time())
            self._save_local()
            return

        if not self.table: return
        raw_item = {self.partition_key: email, "updated_at": int(time.time())}
        raw_item.update(status_dict or {})
        item = self._to_dynamodb_compatible(raw_item)
        try:
            self.table.put_item(Item=item)
        except ClientError as e:
            print(f"[StatusStore] Error writing status for {email}: {e}")

    def get_status(self, email):
        if self.use_local:
            return self.local_data.get(email)

        if not self.table: return None
        try:
            resp = self.table.get_item(Key={self.partition_key: email})
            return resp.get("Item", None)
        except ClientError as e:
            print(f"[StatusStore] Error reading status for {email}: {e}")
            return None

    def update_token(self, email, token):
        if self.use_local:
            if email not in self.local_data:
                self.local_data[email] = {}
            self.local_data[email]["fcm_token"] = token
            self.local_data[email]["updated_at"] = int(time.time())
            self._save_local()
            return

        if not self.table: return
        try:
            self.table.update_item(
                Key={self.partition_key: email},
                UpdateExpression="set fcm_token = :t, updated_at = :u",
                ExpressionAttributeValues={
                    ':t': token,
                    ':u': int(time.time())
                },
                ReturnValues="UPDATED_NEW"
            )
        except ClientError as e:
            print(f"[StatusStore] Error updating token for {email}: {e}")

    def get_all_tokens(self):
        if self.use_local:
            # Reload to ensure we have the latest tokens from other workers/updates
            self._load_local()
            tokens = {v['fcm_token'] for k, v in self.local_data.items() if 'fcm_token' in v and v['fcm_token']}
            print(f"[StatusStore] Loaded tokens: {len(tokens)} found. Data: {self.local_data.keys()}")
            return list(tokens)

        if not self.table: return []
        try:
            response = self.table.scan(
                ProjectionExpression="fcm_token"
            )
            items = response.get('Items', [])
            
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(
                    ProjectionExpression="fcm_token",
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response.get('Items', []))
                
            # Filter out items without fcm_token and deduplicate
            tokens = {item['fcm_token'] for item in items if 'fcm_token' in item and item['fcm_token']}
            return list(tokens)
        except ClientError as e:
            print(f"[StatusStore] Error scanning tokens: {e}")
            return []

status_store = StatusStore()
