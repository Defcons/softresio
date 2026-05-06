import { Anchor, Stack, Text, Title } from "@mantine/core"

const LAST_UPDATED = "May 6, 2026"

export const Privacy = () => (
  <Stack p="md" gap="sm">
    <Title order={2}>Privacy Policy</Title>
    <Text size="sm" c="dimmed">Last updated: {LAST_UPDATED}</Text>

    <Title order={4} mt="md">Who we are</Title>
    <Text size="sm">
      softres.epoglogs.com is a soft-reserve manager for World of Warcraft
      raids, operated as a sister tool to{" "}
      <Anchor href="https://epoglogs.com">epoglogs.com</Anchor>. The source code
      is published under AGPL-3.0 at{" "}
      <Anchor href="https://github.com/Defcons/softresio">
        github.com/Defcons/softresio
      </Anchor>.
    </Text>

    <Title order={4} mt="md">What we collect</Title>
    <Text size="sm">
      <b>Account data (only if you log in with Discord):</b>{" "}
      your Discord user ID, username, and avatar URL. We use these to identify
      you across raids and to display your name to other raiders.
    </Text>
    <Text size="sm">
      <b>Raid data:</b>{" "}
      raids you create or join, soft-reserves you make, attendance, SR+ values,
      hard reserves, and any guild associations you set up. This is the core
      data the service exists to manage.
    </Text>
    <Text size="sm">
      <b>Cookies:</b>{" "}
      a session cookie holding a JWT for your login state, and a short-lived
      OAuth state cookie during Discord login. We do not set marketing or
      tracking cookies of our own.
    </Text>

    <Title order={4} mt="md">Third-party services</Title>
    <Text size="sm">
      <b>Discord:</b>{" "}
      we use Discord OAuth for sign-in. When you log in, Discord shows you what
      we are requesting; we never see your password.
    </Text>
    <Text size="sm">
      <b>Google AdSense:</b>{" "}
      we display ads served by Google. Google and its partners may use cookies
      to serve ads based on your prior visits to this site or other sites. You
      can opt out of personalized ads at{" "}
      <Anchor href="https://www.google.com/settings/ads">
        google.com/settings/ads
      </Anchor>{" "}
      or learn more about advertising cookies at{" "}
      <Anchor href="https://policies.google.com/technologies/ads">
        policies.google.com/technologies/ads
      </Anchor>.
    </Text>
    <Text size="sm">
      <b>Cloudflare:</b>{" "}
      our site is fronted by Cloudflare for TLS and DDoS protection. Cloudflare
      sees connection metadata (IP, request headers) as part of normal proxy
      operation.
    </Text>

    <Title order={4} mt="md">Retention</Title>
    <Text size="sm">
      Raid and soft-reserve data is kept indefinitely so that historical raids
      remain viewable. If you would like your account and associated data
      removed, contact us via the GitHub repository above.
    </Text>

    <Title order={4} mt="md">Your rights</Title>
    <Text size="sm">
      You can request export or deletion of your account data at any time by
      opening an issue on the GitHub repository, referencing your Discord
      username. We will action requests within a reasonable timeframe.
    </Text>

    <Title order={4} mt="md">Children</Title>
    <Text size="sm">
      The service is not directed at children under 13. We do not knowingly
      collect data from children under 13.
    </Text>

    <Title order={4} mt="md">Changes</Title>
    <Text size="sm">
      We may update this policy. The "Last updated" date above reflects the
      latest revision.
    </Text>
  </Stack>
)

export const Terms = () => (
  <Stack p="md" gap="sm">
    <Title order={2}>Terms of Service</Title>
    <Text size="sm" c="dimmed">Last updated: {LAST_UPDATED}</Text>

    <Title order={4} mt="md">The service</Title>
    <Text size="sm">
      softres.epoglogs.com is provided free of charge as a community tool for
      organising World of Warcraft raid loot reservations. It is operated on a
      best-effort basis, with no guarantee of uptime, data durability, or
      feature stability.
    </Text>

    <Title order={4} mt="md">Acceptable use</Title>
    <Text size="sm">
      Don&apos;t use the service to harass other users, spam raids, scrape
      content at abusive rates, attempt to gain unauthorised access, or for any
      activity that violates the law where you live.
    </Text>

    <Title order={4} mt="md">Your content</Title>
    <Text size="sm">
      You retain ownership of the raid information and soft-reserves you enter.
      By using the service, you grant us a non-exclusive license to store,
      display, and serve that data so other raid members can see it.
    </Text>

    <Title order={4} mt="md">Open source</Title>
    <Text size="sm">
      The site is an AGPL-3.0 fork of the upstream{" "}
      <Anchor href="https://github.com/itsols/softres">softres</Anchor>{" "}
      project. Source code for this deployment is available at{" "}
      <Anchor href="https://github.com/Defcons/softresio">
        github.com/Defcons/softresio
      </Anchor>{" "}
      in compliance with the AGPL.
    </Text>

    <Title order={4} mt="md">No warranty</Title>
    <Text size="sm">
      The service is provided &quot;as is&quot;, without warranty of any kind.
      We are not liable for missed loot, dropped raids, or any other
      consequences of using or being unable to use the service.
    </Text>

    <Title order={4} mt="md">Termination</Title>
    <Text size="sm">
      We may suspend access for accounts that violate these terms. You can stop
      using the service at any time.
    </Text>

    <Title order={4} mt="md">Contact</Title>
    <Text size="sm">
      Questions go to the GitHub repository linked above.
    </Text>
  </Stack>
)

export const About = () => (
  <Stack p="md" gap="sm">
    <Title order={2}>About</Title>

    <Text size="sm">
      <b>softres.epoglogs.com</b>{" "}
      is a soft-reserve manager for World of Warcraft raids — built for Project
      Epoch (3.3.5a) and other vanilla / TBC / Wrath flavored servers. Create a
      raid, share the link with your raiders, and they can soft-reserve items
      from the loot table. SR+ tracks long-term loot priority across multiple
      raids.
    </Text>

    <Text size="sm">
      It is the sister site to{" "}
      <Anchor href="https://epoglogs.com">epoglogs.com</Anchor>, the public WoW
      3.3.5 combat-log analyser, and shares its visual identity and Discord
      login.
    </Text>

    <Title order={4} mt="md">Open source</Title>
    <Text size="sm">
      This deployment is an AGPL-3.0 fork of the original{" "}
      <Anchor href="https://github.com/itsols/softres">softres</Anchor>{" "}
      project — credit and gratitude to the upstream authors. Our source is at
      {" "}
      <Anchor href="https://github.com/Defcons/softresio">
        github.com/Defcons/softresio
      </Anchor>; pull requests welcome.
    </Text>

    <Title order={4} mt="md">Legal</Title>
    <Text size="sm">
      See <Anchor href="/privacy">Privacy</Anchor> and{" "}
      <Anchor href="/terms">Terms</Anchor>{" "}
      for how the service handles your data and the conditions of use.
    </Text>
  </Stack>
)
