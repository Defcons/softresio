export type CharacterWithId = {
  id: string
  character: Character
}

export type Class =
  | "Warrior"
  | "Mage"
  | "Paladin"
  | "Priest"
  | "Druid"
  | "Warlock"
  | "Rogue"
  | "Shaman"
export interface Character {
  name: string
  class: Class
  spec: string
}

export interface User {
  userId: string // uuidv4
  issuer: string
  username?: string
}

export interface SoftReserve {
  itemId: number
  srPlus: number | null
  comment: string | null
}

export interface Attendee {
  character: Character
  softReserves: SoftReserve[]
  user: User
}

export interface Password {
  salt: string
  hash: string
}

export type BaseActivity = {
  time: string // rfc3339
  byUser: User
}

export type Activity = RaidChanged | SrChanged | AdminChanged

export interface RaidChanged extends BaseActivity {
  type: "RaidChanged"
  change: "created" | "edited" | "locked" | "unlocked"
}

export interface SrChanged extends BaseActivity {
  type: "SrChanged"
  change: "created" | "deleted"
  itemId: number
  character?: Character
}

export interface AdminChanged extends BaseActivity {
  type: "AdminChanged"
  change: "promoted" | "removed"
  character?: Character
  user: User
}

export interface Sheet {
  raidId: string
  useSrPlus: boolean
  instanceId: number
  time: string // rfc 3339
  attendees: Attendee[]
  admins: User[]
  activityLog: Activity[]
  srCount: number
  description: string
  locked: boolean
  hardReserves: number[]
  allowDuplicateSr: boolean
  owner: User
}

export interface Raid {
  sheet: Sheet
}

interface GenericResponse<T> {
  data?: T
  error?: string
  user: User
}

export interface CreateEditRaidRequest {
  raidId?: string // Only set if it's an edit
  instanceId: number
  description: string
  useSrPlus: boolean
  adminPassword: string
  time: string //rfc 3339
  srCount: number
  hardReserves: number[]
  allowDuplicateSr: boolean
}

export type GetInstancesResponse = GenericResponse<Instance[]>

export type CreateEditRaidResponse = GenericResponse<{ raidId: string }>

export type CreateSrResponse = GenericResponse<Sheet>

export type GetRaidResponse = GenericResponse<Sheet>

export type InfoResponse = GenericResponse<
  { discordClientId: string | undefined; discordLoginEnabled: boolean }
>

export type SignOutResponse = GenericResponse<void>

export type GetMyRaidsResponse = GenericResponse<Raid[]>

export type GetCharactersResponse = GenericResponse<Character[]>

export type EditAdminRequest = {
  raidId: string
  add?: User
  remove?: User
}
export type LockRaidResponse = GenericResponse<Sheet>

export type DeleteSrRequest = {
  raidId: string
  user: User
  itemId: number
}
export type DeleteSrResponse = GenericResponse<Sheet>

export type EditAdminResponse = GenericResponse<Sheet>

export interface CreateSrRequest {
  raidId: string
  character: Character
  selectedItemIds: number[]
}

export interface DropsFrom {
  npcId: number
  bossId: number
  chance: number
}

export interface Item {
  id: number
  tooltip: string
  icon: string
  name: string
  slots: string[]
  types: string[]
  dropsFrom: DropsFrom[]
  classes: Class[]
  quality: 1 | 2 | 3 | 4 | 5
}

export interface Npc {
  id: number
  name: string
  bossId: number
}

export interface Boss {
  id: number
  name: string
}

export interface Instance {
  id: number
  name: string
  shortname: string
  items: Item[]
  bosses: Boss[]
  npcs: Npc[]
}

export interface ItemPickerElementType {
  segment?: string
  item?: Item
}
