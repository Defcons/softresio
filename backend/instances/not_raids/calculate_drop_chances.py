import json

import demjson3
import requests


def collect_drops_npc(items):
    result = {}

    for item in items:
        item_id = item["id"]

        if item_id not in result:
            result[item_id] = {"id": item_id, "name": item["name"], "drops": []}

        result[item_id]["drops"].append(
            {
                "group": item.get("group", 0),
                "percent": item["percent"],
            }
        )

    return list(result.values())


def collect_drops_boss(loot):
    return {k: collect_drops_npc(v) for k, v in loot.items()}


def extract_loot_npc_or_object(text):
    # --- extract data array ---
    start = text.find("data:")
    if start == -1:
        raise ValueError("data: not found")

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
    npcs = boss["loot"]
    total_loot = {}
    for npc in npcs:
        link = npc["link"]
        text = requests.get(link).text
        loot = extract_loot_npc_or_object(text)
        total_loot[npc["name"]] = loot
    return total_loot


def drops_at_least_one(loot):
    ret = {}
    for npc, items in loot.items():
        for drop in items:
            doesnt_drop = 1
            percentages = [group["percent"] for group in drop["drops"]]
            for percentage in percentages:
                doesnt_drop *= (100 - percentage) / 100
            at_least_one = (1 - doesnt_drop) * 100
            if npc not in ret:
                ret[npc] = {}
            ret[npc][drop["id"]] = fmt(at_least_one)
    return ret


def extract_loot_raid(raid):
    ret = {}
    for boss in raid["bosses"]:
        loot = drops_at_least_one(collect_drops_boss(extract_loot_boss(boss)))
        ret[boss["name"]] = loot
    return ret


with open("raid_bosses.json", "r") as f:
    kara40 = json.loads(f.read())

total_dict = {}
for name, raid in kara40["raids"].items():
    total_dict[name] = extract_loot_raid(raid)
print(json.dumps(total_dict))
