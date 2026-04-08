import json
import requests

lines = open("trash").read().strip().split("\n")

known = open("instances.json").read()
instances = {}
output = {}

for line in lines:
    if line[0] == "#":
        print(json.dumps(output))
        current_raid = line[1:]
        print(f"########## {current_raid} ##########")
        output = {
                    "name": "Trash",
                    "npcs": [
                    ]
                  }
    else:
        try:
            npc = requests.get(f"https://database.turtlecraft.gg/?search={line}", allow_redirects=False).headers["Location"]
            link = "https://database.turtlecraft.gg/" + npc
            if link in known:
                print(f"Skipping {npc}")
                continue
            output["npcs"].append(
              {
                "name": line,
                "link": link,
              }
            )
        except:
            print(f"Could not find {line}")

