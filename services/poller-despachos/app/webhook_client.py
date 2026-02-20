import requests

def send(url,data):
    try:
        r = requests.post(url,json=data,timeout=5)
        return r.status_code
    except:
        return 0
