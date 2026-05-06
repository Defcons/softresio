import { Hono } from "hono"
import type { AdminStatsResponse } from "../shared/types.ts"
import { sql } from "./database.ts"
import { getOrCreateUser, isAdmin } from "./utils.ts"

const app = new Hono()

// Block every /api/admin/* route for non-admins.
app.use("/api/admin/*", async (c, next) => {
  const user = await getOrCreateUser(c)
  if (!isAdmin(user)) {
    return c.json({ error: { message: "Forbidden" }, user }, 403)
  }
  return await next()
})

app.get("/api/admin/stats", async (c) => {
  const user = await getOrCreateUser(c)

  // All counts ignore deleted raids. Where a raid creation timestamp is
  // needed we pull it from the activityLog (the raid's row has no DB-level
  // created_at column — the type's `time` field is the scheduled raid time,
  // which can be in the future).
  const [{ totalRaids, recentRaids7d, recentRaids30d }] = await sql<
    {
      totalRaids: number
      recentRaids7d: number
      recentRaids30d: number
    }[]
  >`
    select
      count(*)::int as "totalRaids",
      count(*) filter (
        where exists (
          select 1 from jsonb_array_elements(raid->'activityLog') a
          where a->>'type' = 'RaidChanged'
            and a->>'change' = 'created'
            and (a->>'time')::timestamptz >= now() - interval '7 days'
        )
      )::int as "recentRaids7d",
      count(*) filter (
        where exists (
          select 1 from jsonb_array_elements(raid->'activityLog') a
          where a->>'type' = 'RaidChanged'
            and a->>'change' = 'created'
            and (a->>'time')::timestamptz >= now() - interval '30 days'
        )
      )::int as "recentRaids30d"
    from raids
    where (raid->>'deleted')::bool is not true;
  `

  const [{ totalGuilds }] = await sql<{ totalGuilds: number }[]>`
    select count(*)::int as "totalGuilds" from guilds
    where (guild->>'deleted')::bool is not true;
  `

  // Distinct users seen across attendees, admins, and owners on non-deleted
  // raids. JSONB unnest + union, then count distinct.
  const [{ totalUsers }] = await sql<{ totalUsers: number }[]>`
    select count(distinct uid)::int as "totalUsers" from (
      select a->'user'->>'userId' as uid
        from raids,
             jsonb_array_elements(raid->'attendees') a
        where (raid->>'deleted')::bool is not true
      union
      select a->>'userId' as uid
        from raids,
             jsonb_array_elements(raid->'admins') a
        where (raid->>'deleted')::bool is not true
      union
      select raid->'owner'->>'userId' as uid
        from raids
        where (raid->>'deleted')::bool is not true
    ) u where uid is not null;
  `

  // Top instances by raid count.
  const topInstances = await sql<{ instanceId: number; raidCount: number }[]>`
    select
      (raid->>'instanceId')::int as "instanceId",
      count(*)::int as "raidCount"
    from raids
    where (raid->>'deleted')::bool is not true
    group by 1
    order by 2 desc
    limit 20;
  `

  // Top SR'd items across all raids.
  const topItems = await sql<{ itemId: number; reserveCount: number }[]>`
    select
      (sr->>'itemId')::int as "itemId",
      count(*)::int as "reserveCount"
    from raids,
         jsonb_array_elements(raid->'attendees') a,
         jsonb_array_elements(a->'softReserves') sr
    where (raid->>'deleted')::bool is not true
    group by 1
    order by 2 desc
    limit 20;
  `

  // Latest 50 raids, scored by the most recent activity entry (or scheduled
  // time if the activity log is empty). For anonymous owners (no Discord
  // username), pull the character name they used in their own raid as a
  // friendlier display label.
  const recentRaids = await sql<
    {
      id: string
      instanceId: number
      ownerName: string | null
      ownerCharacter: string | null
      ownerUserId: string
      time: string
      attendeeCount: number
      srCount: number
      locked: boolean
      guildId: string | null
      latestActivity: string | null
    }[]
  >`
    select
      raid->>'id' as id,
      (raid->>'instanceId')::int as "instanceId",
      raid->'owner'->>'username' as "ownerName",
      (
        select a->'character'->>'name'
        from jsonb_array_elements(raid->'attendees') a
        where a->'user'->>'userId' = raid->'owner'->>'userId'
        limit 1
      ) as "ownerCharacter",
      raid->'owner'->>'userId' as "ownerUserId",
      raid->>'time' as time,
      coalesce(jsonb_array_length(raid->'attendees'), 0)::int as "attendeeCount",
      coalesce((raid->>'srCount')::int, 0) as "srCount",
      coalesce((raid->>'locked')::bool, false) as locked,
      raid->>'guildId' as "guildId",
      (
        select max((a->>'time')::timestamptz)::text
        from jsonb_array_elements(raid->'activityLog') a
      ) as "latestActivity"
    from raids
    where (raid->>'deleted')::bool is not true
    order by coalesce(
      (
        select max((a->>'time')::timestamptz)
        from jsonb_array_elements(raid->'activityLog') a
      ),
      (raid->>'time')::timestamptz
    ) desc nulls last
    limit 50;
  `

  // Top users by raids attended. We surface their most-frequent character
  // name as a fallback display label for anonymous users (no Discord
  // username). mode() WITHIN GROUP returns the most-occurring value.
  const topUsers = await sql<
    {
      userId: string
      username: string | null
      topCharacter: string | null
      raidCount: number
    }[]
  >`
    select
      a->'user'->>'userId' as "userId",
      max(a->'user'->>'username') as username,
      mode() within group (order by a->'character'->>'name') as "topCharacter",
      count(distinct raid->>'id')::int as "raidCount"
    from raids,
         jsonb_array_elements(raid->'attendees') a
    where (raid->>'deleted')::bool is not true
      and a->'user'->>'userId' is not null
    group by 1
    order by 4 desc
    limit 20;
  `

  const response: AdminStatsResponse = {
    user,
    data: {
      totalRaids,
      totalGuilds,
      totalUsers,
      recentRaids7d,
      recentRaids30d,
      topInstances,
      topItems,
      topUsers,
      recentRaids,
    },
  }
  return c.json(response)
})

export default app
