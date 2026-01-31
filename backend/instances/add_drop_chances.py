import json
from glob import glob

instances = []
for file in glob("*.json"):
    instances.append(json.loads(open(file).read()))

all_drop_chances = json.loads(open("drop_chances").read())


for instance in instances:
    drop_chances = all_drop_chances[instance["shortname"]]
    instance_npcs = []
    instance_bosses = []
    new_items = []
    instance["npcs"] = []
    instance["bosses"] = []
    for item in instance["items"]:
        drops_from = []
        for boss, npcs in drop_chances.items():
            if boss not in instance_bosses:
                instance_bosses.append(boss)
                instance["bosses"].append({"name": boss, "id": len(instance_bosses)-1})
            boss_id = instance_bosses.index(boss)
            for npc, items in npcs.items():
                if npc not in instance_npcs:
                    instance_npcs.append(npc)
                    instance["npcs"].append({"name": boss, "id": len(instance_npcs)-1, "bossId": boss_id})
                npc_id = instance_npcs.index(npc)
                match = list(filter(lambda i: i[0] == str(item["id"]), items.items()))
                if len(match) > 0:
                    drops_from.append({"chance": match[0][1], "bossId": boss_id, "npcId": npc_id})
        if len(drops_from) == 0:
            if "Trash" not in instance_bosses:
                instance_bosses.append("Trash")
                instance["bosses"].append({"name": "Trash", "id": len(instance_bosses)-1})
            boss_id = instance_bosses.index("Trash")
            if "Trash" not in instance_npcs:
                instance_npcs.append("Trash")
                instance["npcs"].append({"name": "Trash", "id": len(instance_npcs)-1, "bossId": boss_id})
            npc_id = instance_npcs.index("Trash")
            drops_from.append({"chance": None, "bossId": boss_id, "npcId": npc_id})

        new_items.append({**item, "dropsFrom": drops_from})
    instance["items"] = new_items
    open(instance["shortname"]+".json", "w").write(json.dumps(instance))

