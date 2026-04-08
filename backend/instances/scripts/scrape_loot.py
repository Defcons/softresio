import json
import re
import demjson3
import requests
from tqdm import tqdm
from functools import lru_cache

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
    # --- extract data array ---
    start = text.find("data:")
    if start == -1:
        return []

    i = text.find("[", start)
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                js_data = text[i : j + 1]
                break
    else:
        raise ValueError("Unterminated data array")

    # print(" --- convert JS → JSON ---")
    decoded = demjson3.decode(js_data)
    # print(type(decoded))
    return decoded
    # print(json_like)
    #
    # print(' quote object keys: name: → "name":')
    # json_like = re.sub(r"(\w+)\s*:", r'"\1":', json_like)
    # print(json_like)
    #
    # print(" single quotes → double quotes")
    # json_like = json_like.replace("'", '"')
    # print(json_like)
    #
    # print(" remove trailing commas")
    # json_like = re.sub(r",\s*([}\]])", r"\1", json_like)
    # print(json_like)
    #
    # print(" --- parse ---")
    # data = json.loads(json_like)
    # return data


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
    url = f"https://database.turtlecraft.gg/ajax.php?item={item_id}"
    raw_item_data = requests.get(url, headers={"cookie": 'PHPSESSID=db250a5ebffd6f3b40aadf50c6fd5075'}).text
    tooltip_data = demjson3.decode("{" + raw_item_data.split("{")[1].split("}")[0] + "}")
    return tooltip_data

def get_slot(tooltip):
    slots = [
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
      "Held In Off-Hand",
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
      "Miscellaneous",
    ]
    for slot in slots:
        slots = []
        if "<br />Quest Item<br />" in tooltip or "This Item Begins a Quest" in tooltip:
            slots.append("Quest Item")
        if f"<td>{slot}</td>".lower() in tooltip.lower():
            slots.append(slot)
        if f"<th>Thrown</th>".lower() in tooltip.lower():
            slots.append("Ranged")
        if slots:
            return slots
    return ["Miscellaneous"]

def get_type(tooltip):
    types = ['Plate', 'Axe', 'Libram', 'Plate,', 'Staff', 'Mail,', 'Fist', 'Weapon', 'Dagger', 'Mail', 'Polearm', 'Shield', 'Gun', 'Crossbow', 'Thrown', 'Wand', 'Cloth', 'Mace', 'Sword', 'Totem', 'Leather', 'Idol', 'Leather,']
    for t in types:
        if f"<th>{t}</th>".lower() in tooltip.lower():
            return [t]
    return []

def get_classes(tooltip):
    match = re.search(r"Classes:\s*([^<]+)", tooltip)

    if match:
        # Del strengen ved kommaer og fjern overflødigt mellemrum
        class_list = [c.strip() for c in match.group(1).split(",")]
        return class_list
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
                    if not greens and tooltip_data["quality"] == 2:
                        continue
                    instance_items.append({
                      "id": drop["id"],
                      "name": tooltip_data["name"],
                      "classes": get_classes(tooltip_data["tooltip"]),
                      "quality": tooltip_data["quality"],
                      "tooltip": tooltip_data["tooltip"],
                      "icon": tooltip_data["icon"].lower()+".png",
                      "dropsFrom": [
                        {
                          "chance": fmt(at_least_one),
                          "bossId": len(bosses),
                          "npcId": len(npcs)
                        }
                      ],
                      "slots": get_slot(tooltip_data["tooltip"]),
                      "types": get_type(tooltip_data["tooltip"])
                    })
                except:
                    ...
                    # print(f"Could not parse {drop['id']}")
            npcs.append({"id": len(npcs), "name": npc, "bossId": len(bosses)})
        bosses.append({"id": len(bosses), "name": boss["name"]})
    return instance_items, bosses, npcs


with open("instances.json", "r") as f:
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
