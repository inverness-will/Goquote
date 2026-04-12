#!/usr/bin/env python3
"""
Stream Deck -> Alta Video sensor webhook bridge.

Listens for button presses (keys 0-5 → channels 1-6) on an Elgato Stream Deck
and POSTs a sensor webhook to Alta Video for the corresponding channel.
"""

import json
import sys
import time
import threading
import requests
from StreamDeck.DeviceManager import DeviceManager
from StreamDeck.Transport.Transport import TransportError

WEBHOOK_URL = (
    "https://ecosystem-1000.us6.alta.avigilon.com/api/v1/public/"
    "sensorWebhooks/vaion/c295ffb6-b005-4dd2-8457-81e422261c35/5VEDUh0AMP"
)

CHANNEL_COUNT = 6


def send_webhook(channel_id: str, status: str = "alarm", value: int = 1):
    payload = [
        {
            "channel_id": channel_id,
            "value": value,
            "timestamp": int(time.time() * 1000),
            "status": status,
        }
    ]
    print(f"  Payload: {json.dumps(payload, indent=2)}")
    try:
        resp = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        print(f"  -> Webhook channel {channel_id} ({status}): HTTP {resp.status_code}")
        if resp.status_code != 200:
            print(f"  Response: {resp.text}")
    except requests.RequestException as exc:
        print(f"  !! Webhook channel {channel_id} failed: {exc}")


def key_change_callback(deck, key, key_state):
    if key >= CHANNEL_COUNT:
        return

    channel_id = str(key + 1)

    if key_state:
        print(f"Button {key + 1} PRESSED  — triggering channel {channel_id}")
        send_webhook(channel_id, status="warning", value=1)
    else:
        print(f"Button {key + 1} RELEASED — clearing  channel {channel_id}")
        send_webhook(channel_id, status="normal", value=0)


def main():
    decks = DeviceManager().enumerate()
    print(f"Found {len(decks)} Stream Deck(s).")

    if not decks:
        print("No Stream Deck found. Is it plugged in?")
        sys.exit(1)

    deck = decks[0]
    deck.open()
    deck.reset()

    serial = deck.get_serial_number()
    key_count = deck.KEY_COUNT
    print(f"Opened '{deck.deck_type()}' (serial {serial}), {key_count} keys")
    print(f"Listening on buttons 1-{min(CHANNEL_COUNT, key_count)} …")
    print("Press Ctrl+C to quit\n")

    deck.set_brightness(50)
    deck.set_key_callback(key_change_callback)

    try:
        for t in threading.enumerate():
            try:
                t.join()
            except (TransportError, RuntimeError):
                pass
    except KeyboardInterrupt:
        pass
    finally:
        deck.reset()
        deck.close()
        print("\nStream Deck closed. Goodbye.")


if __name__ == "__main__":
    main()
