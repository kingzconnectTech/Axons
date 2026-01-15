import os
import time
import boto3

class StatusStore:
    def __init__(self):
        self.table_name = os.environ.get("AXON_STATUS_TABLE")
        self.region = os.environ.get("AWS_REGION", "us-east-1")
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region)
        if not self.table_name:
            raise RuntimeError("AXON_STATUS_TABLE not set")
        self.table = self.dynamodb.Table(self.table_name)

    def set_status(self, email, status_dict):
        item = {"email": email, "updated_at": int(time.time())}
        item.update(status_dict or {})
        self.table.put_item(Item=item)

    def get_status(self, email):
        resp = self.table.get_item(Key={"email": email})
        return resp.get("Item", None)

status_store = StatusStore()
