import os
import time
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

class StatusStore:
    def __init__(self):
        self.table_name = os.environ.get("AXON_STATUS_TABLE")
        self.region = os.environ.get("AWS_REGION", "us-east-1")
        
        if not self.table_name:
            print("[StatusStore] Warning: AXON_STATUS_TABLE not set. Status storage disabled.")
            self.table = None
            self.partition_key = None
            return

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

    def _to_dynamodb_compatible(self, value):
        if isinstance(value, float):
            return Decimal(str(value))
        if isinstance(value, dict):
            return {k: self._to_dynamodb_compatible(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._to_dynamodb_compatible(v) for v in value]
        return value

    def set_status(self, email, status_dict):
        if not self.table: return
        raw_item = {self.partition_key: email, "updated_at": int(time.time())}
        raw_item.update(status_dict or {})
        item = self._to_dynamodb_compatible(raw_item)
        try:
            self.table.put_item(Item=item)
        except ClientError as e:
            print(f"[StatusStore] Error writing status for {email}: {e}")

    def get_status(self, email):
        if not self.table: return None
        try:
            resp = self.table.get_item(Key={self.partition_key: email})
            return resp.get("Item", None)
        except ClientError as e:
            print(f"[StatusStore] Error reading status for {email}: {e}")
            return None

    def update_token(self, email, token):
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
