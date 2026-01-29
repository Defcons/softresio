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

export interface Activity {
  time: string // rfc3339
  user: User
  action:
    | "SRDeleted"
    | "SRCreated"
    | "SRUpdated"
    | "RaidCreated"
    | "RaidUpdated"
  attendee: Attendee
}

export interface Sheet {
  raidId: string
  useSrPlus: boolean
  instanceId: number
  time: string // rfc 3339
  attendees: Attendee[]
  admins: User[]
  password: Password
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

export interface CreateRaidRequest {
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

export type CreateRaidResponse = GenericResponse<{ raidId: string }>

export type CreateSrResponse = GenericResponse<Sheet>

export type GetRaidResponse = GenericResponse<Sheet>

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
  bossId: string
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
}
