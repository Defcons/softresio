import * as fs from "node:fs"
import type { Instance } from "../shared/types.ts"

export const instances: Instance[] = []

fs.glob("./instances/*.json", async (err, matches) => {
  if (err) {
    throw err
  }
  for (const file of matches) {
    const instance: Instance = JSON.parse(await Deno.readTextFile(file))
    instances.push(instance)
  }
})
