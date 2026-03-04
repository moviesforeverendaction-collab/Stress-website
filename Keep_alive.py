#!/usr/bin/env python3
import requests
import time
import sys
from datetime import datetime

def ping_service(url, interval=300, max_retries=3):
    retry_count = 0
    
    while True:
        try:
            response = requests.get(f"{url}/api/ping", timeout=10)
            if response.status_code == 200:
                print(f"[{datetime.now()}] ✓ Ping successful - Status: {response.status_code}")
                retry_count = 0
            else:
                print(f"[{datetime.now()}] ✗ Ping failed - Status: {response.status_code}")
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"[{datetime.now()}] ✗ Max retries exceeded!")
                    sys.exit(1)
        except requests.exceptions.RequestException as e:
            print(f"[{datetime.now()}] ✗ Ping error: {e}")
            retry_count += 1
            if retry_count >= max_retries:
                print(f"[{datetime.now()}] ✗ Max retries exceeded!")
                sys.exit(1)
        
        print(f"[{datetime.now()}] ⏳ Next ping in {interval}s...")
        time.sleep(interval)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python keep_alive.py <url> [interval]")
        print("Example: python keep_alive.py https://devicestress.onrender.com 300")
        sys.exit(1)
    
    url = sys.argv[1].rstrip('/')
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    
    print(f"[{datetime.now()}] Starting keep-alive service...")
    print(f"[{datetime.now()}] Pinging: {url}")
    print(f"[{datetime.now()}] Interval: {interval}s")
    
    ping_service(url, interval)
