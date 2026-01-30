from glob import glob
import json
import requests
import re
import sys

items = []

instances = []
raids = []

for file in glob("*.json"):
    instances.append(json.loads(open(file).read()))

lines = open("bosses").read().split("\n")
bosses = {}
current_bosses = None
current_npcs = None
current_instance_name = None
npc_id = 0
boss_id = 0
for line in lines:
    content = line.strip()
    if line.startswith("    "): # NPC
        current_npcs.append({"bossId": boss_id-1, "id": npc_id, "name": content})
        npc_id += 1
    elif line.startswith("  "): # Boss
        current_bosses.append({"id": boss_id, "name": content})
        boss_id += 1
    else:
        if current_instance_name:
            bosses[current_instance_name] = {"bosses": current_bosses, "npcs": current_npcs}
        current_bosses = []
        current_npcs = []
        current_instance_name = content




for instance in instances:
    new_items = []
    for item in instance["items"]:
        link = f"https://database.turtlecraft.gg/?item={item["id"]}"
        r = requests.get(link)
        dropsFrom = []
        splits = r.text.split("Listview")
        if not len(splits) > 2:
            open("fucked_links", "a").write(link+"\n")
            continue
        npcs = re.findall(r"name: '(.*?)',", splits[2])
        for npc in npcs:
            npc = npc.replace("\\", "\\\\")
            try:
                drop_chance = float(re.search(fr"{npc}.*?percent: ([0-9\.]+)", r.text).group(1))
            except:
                print(npc, file=sys.stderr)
                drop_chance = None
            npc = npc.replace("\\\\", "")

            if not any(filter(lambda n: n["name"] == npc, bosses[instance["name"]]["npcs"])):
                print(npc, file=sys.stderr)
                npc = "Trash"
            npc = next(filter(lambda n: n["name"] == npc, bosses[instance["name"]]["npcs"]))
            npc_id = npc["id"]
            boss_id = npc["bossId"]
            if not any(filter(lambda d: d["npcId"] == npc_id, dropsFrom)):
                dropsFrom.append({"npcId": npc_id, "bossId": boss_id, "chance": drop_chance})

        item["dropsFrom"] = dropsFrom
        new_items.append(item)
    instance["bosses"] = bosses[instance["name"]]["bosses"]
    instance["npcs"] = bosses[instance["name"]]["npcs"]
    instance["items"] = new_items
    open(instance["shortname"] + ".json", "w").write(json.dumps(instance))
