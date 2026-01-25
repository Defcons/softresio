from glob import glob
import json


items = []

for file in glob("*.json"):
    items = items + json.loads(open(file).read())["items"]

types = set()
slots = set()

for item in items:
    types.add(item["type"])
    slots.add(item["slot"])


order = [
    "Class",
    "Token",
    "Head",
    "Neck",
    "Shoulder",
    "Back",
    "Chest",
    "Wrist",
    "Hands",
    "Waist",
    "Legs",
    "Feet",
    "Finger",
    "Trinket",
    "Main Hand",
    "Off Hand",
    "Held In Off-hand",
    "One-Hand",
    "Two-Hand",
    "Ranged",
    "Relic",
    "Quest Item",
    "Mount",
    "Bag",
    "Profession",
    "Materials",
    "Consumable",
    "Companion",
    "Books",
    "Miscellaneous"
]

print("{")
for s in sorted(slots, key=lambda e: order.index(e)):
    print(f'  "{s}": [')
    types = set()
    for item in items:
        if item["slot"] == s and item["type"] != None:
            types.add(item["type"])
    for typ in types:
        print(f'    "{typ}",')
    print("  ],")
print("}")
