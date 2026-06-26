import firebase_admin
from firebase_admin import credentials, firestore, auth
 
# Khởi tạo Firebase một lần duy nhất
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)
 
db = firestore.client()
 
def get_db():
    return db
 
def get_auth():
    return auth
 