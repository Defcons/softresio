import process from "node:process"

export const getEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

export const generateRaidId = (): string => {
  const characterSet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let raidId = ""
  for (let i = 0; i < 5; i++) {
    raidId += characterSet[Math.floor(Math.random() * characterSet.length)]
  }
  return raidId
}

