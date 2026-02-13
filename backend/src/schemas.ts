import * as z from "zod"

export const raidIdSchema = z.string().length(5)
export const uuidSchema = z.string().length(36)

export const characterSchema = z.object({
  name: z.string().max(12).min(1),
  class: z.string().max(20).min(1),
  spec: z.string().max(20).min(1),
})

export const userSchema = z.object({
  userId: z.string().max(36).min(15),
  issuer: z.string().min(1).max(20),
})
