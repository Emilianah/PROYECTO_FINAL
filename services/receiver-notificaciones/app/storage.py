NOTIFICATIONS = []

def save(data):
    NOTIFICATIONS.append(data)
    return data

def list_all():
    return NOTIFICATIONS
