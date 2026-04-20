import json
import requests
from tqdm import tqdm
from functools import lru_cache
from bs4 import BeautifulSoup


def collect_drops_npc(items):
    result = {}

    for item in items:
        item_id = item["id"]

        if item_id not in result:
            result[item_id] = {"id": item_id, "name": item["name"], "drops": []}

        result[item_id]["drops"].append(
            {
                "group": item.get("group", 0),
                "percent": item.get("percent", 0)
            }
        )

    return list(result.values())


def collect_drops_boss(boss):
    return {k: collect_drops_npc(v) for k, v in boss.items()}


def extract_loot_npc_or_object(text):
    soup = BeautifulSoup(text, "html.parser")
    items = []

    for row in soup.select("tbody tr"):
        wrapper = row.select_one("[data-item-id]")
        cells = row.select("td")
        if not wrapper or len(cells) < 3:
            continue

        item_id = int(wrapper["data-item-id"])
        name_el = row.select_one("span.font-medium")
        name = name_el.get_text(strip=True) if name_el else str(item_id)

        rate_text = cells[2].get_text(strip=True).replace("%", "")
        try:
            percent = float(rate_text)
        except ValueError:
            percent = 0.0

        items.append({
            "id": item_id,
            "name": name,
            "percent": percent,
            "group": 0
        })

    return items


def fmt(p):
    return round(abs(p), 0)


def extract_loot_boss(boss):
    npcs = boss["npcs"]
    total_loot = {}
    for npc in npcs:
        link = npc["link"]
        text = requests.get(link).text
        loot = extract_loot_npc_or_object(text)
        total_loot[npc["name"]] = loot
    return total_loot


@lru_cache(maxsize=None)
def get_tooltip_data(item_id):
    url = f"https://epochhead.com/api/item/{item_id}"
    return requests.get(url).json()


def get_slot(item):
    tooltip = item.get("tooltip", [])
    tooltip_str = " | ".join(tooltip)
    item_type = item.get("itemType", "") or ""
    item_sub = item.get("itemSubType", "") or ""
    equip_slot = item.get("equipSlot", "") or ""

    if "This Item Begins a Quest" in tooltip_str or item_type == "Quest":
        return ["Quest Item"]

    slot_map = {
        "Head": "Head",
        "Neck": "Neck",
        "Shoulder": "Shoulder",
        "Back": "Back",
        "Chest": "Chest",
        "Wrist": "Wrist",
        "Hands": "Hands",
        "Waist": "Waist",
        "Legs": "Legs",
        "Feet": "Feet",
        "Finger": "Finger",
        "Trinket": "Trinket",
        "Main Hand": "Main Hand",
        "Off Hand": "Off Hand",
        "Held In Off-Hand": "Held In Off-Hand",
        "One-Hand": "One-Hand",
        "Two-Hand": "Two-Hand",
        "Ranged": "Ranged",
        "Relic": "Relic",
        "Thrown": "Ranged",
    }
    for key, val in slot_map.items():
        if key.lower() in equip_slot.lower():
            return [val]

    special_map = {
        "Mount": "Mount",
        "Bag": "Bag",
        "Consumable": "Consumable",
        "Companion": "Companion",
        "Recipe": "Profession",
        "Token": "Token",
        "Miscellaneous": "Miscellaneous",
    }
    for key, val in special_map.items():
        if key.lower() in item_type.lower() or key.lower() in item_sub.lower():
            return [val]

    return ["Miscellaneous"]


def get_type(item):
    types = [
        'Plate', 'Mail', 'Leather', 'Cloth',
        'Axe', 'Sword', 'Mace', 'Dagger', 'Fist',
        'Staff', 'Polearm', 'Wand',
        'Gun', 'Crossbow', 'Bow', 'Thrown',
        'Shield', 'Libram', 'Idol', 'Totem',
    ]
    item_sub = item.get("itemSubType", "") or ""
    item_type = item.get("itemType", "") or ""
    combined = (item_type + " " + item_sub).lower()
    for t in types:
        if t.lower() in combined:
            return [t]
    return []


def get_classes(item):
    tooltip = item.get("tooltip", [])
    for line in tooltip:
        if line.startswith("Classes:"):
            return [c.strip() for c in line.replace("Classes:", "").split(",")]
    return []


def extract_loot_instance(instance):
    instance_items = []
    bosses = []
    npcs = []
    for boss in instance["bosses"]:
        for npc, items in collect_drops_boss(extract_loot_boss(boss)).items():
            print(npc)
            for drop in tqdm(items):
                doesnt_drop = 1
                percentages = [group["percent"] for group in drop["drops"]]
                for percentage in percentages:
                    doesnt_drop *= (100 - percentage) / 100
                at_least_one = (1 - doesnt_drop) * 100
                tooltip_data = get_tooltip_data(drop["id"])
                try:
                    greens = next(filter(lambda n: n["name"] == npc, boss["npcs"])).get("greens", False)
                    if not greens and tooltip_data["rarity"] == 2:
                        continue
                    instance_items.append({
                        "id": drop["id"],
                        "name": tooltip_data["name"],
                        "classes": get_classes(tooltip_data),
                        "quality": tooltip_data["rarity"],
                        "tooltip": tooltip_data["tooltip"],
                        "icon": tooltip_data["icon"].lower() + ".png",
                        "dropsFrom": [
                            {
                                "chance": fmt(at_least_one),
                                "bossId": len(bosses),
                                "npcId": len(npcs)
                            }
                        ],
                        "slots": get_slot(tooltip_data),
                        "types": get_type(tooltip_data)
                    })
                except:
                    pass
                    # print(f"Could not parse {drop['id']}")
            npcs.append({"id": len(npcs), "name": npc, "bossId": len(bosses)})
        bosses.append({"id": len(bosses), "name": boss["name"]})
    return instance_items, bosses, npcs


with open("instances_epoch.json", "r") as f:
    instances = json.loads(f.read())

total_dict = {}
for instance in instances:
    print(instance["name"])
    items, bosses, npcs = extract_loot_instance(instance)
    open(f"../{instance['shortname']}.json", "w").write(json.dumps({
        "id": instance["id"],
        "shortname": instance["shortname"],
        "raid": instance["raid"],
        "name": instance["name"],
        "items": items,
        "bosses": bosses,
        "npcs": npcs
    }))
