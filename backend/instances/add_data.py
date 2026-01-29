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


boss_map={}

for instance in instances:
    bosses = []
    new_items = []
    for item in instance["items"]:
        link = f"https://database.turtlecraft.gg/?item={item["id"]}"
        r = requests.get(link)
        dropsFrom = []
        splits = r.text.split("Listview")
        if not len(splits) > 2:
            open("fucked_links", "a").write(link+"\n")
            continue
        scraped_bosses = re.findall(r"name: '(.*?)',", splits[2])
        for boss in scraped_bosses:
            boss = boss.replace("\\", "\\\\")
            try:
                drop_chance = float(re.search(fr"{boss}.*?percent: ([0-9\.]+)", r.text).group(1))
            except:
                print("------- failed! ------", file=sys.stderr)
                print(boss, file=sys.stderr)
                print(link, file=sys.stderr)
                print(splits[2], file=sys.stderr)
                drop_chance = None
            boss = boss.replace("\\\\", "")
            if boss not in bosses:
                bosses.append(boss)
            boss_id = bosses.index(boss)
            dropsFrom.append({"bossId": boss_id, "chance": drop_chance})

        item["dropsFrom"] = dropsFrom
        item["slots"] = [item["slot"]]
        item["types"] = [] if not item["type"] else [item["type"]]
        del item["slot"]
        del item["type"]

        new_items.append(item)
    instance["bosses"] = list(map(lambda e: {"bossId": e[0], "name": e[1]}, enumerate(bosses)))
    instance["items"] = new_items
    open(instance["shortname"] + ".json", "w").write(json.dumps(instance))
