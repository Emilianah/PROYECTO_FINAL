import time
import os
import requests
from webhook_client import send

API = os.getenv("SWAPSHOP_API_URL")
WEBHOOK = os.getenv("WEBHOOK_RECEIVER_URL")
INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS",5))

def run():
    print("Polling iniciado Swap Shop...")

    while True:
        try:
            r = requests.get(f"{API}/orders/pending")
            orders = r.json()

            if len(orders)>0:
                print("Pedidos encontrados:",len(orders))

            for o in orders:

                payload={
                    "evento":"ORDER_READY",
                    "order_id":o["id"],
                    "cliente":o["cliente"],
                    "total":o["total"]
                }

                status = send(WEBHOOK,payload)

                if status==200:
                    print("Webhook enviado:",o["id"])
                    requests.post(f"{API}/orders/{o['id']}/mark-processed")

        except Exception as e:
            print("Error polling:",e)

        time.sleep(INTERVAL)
