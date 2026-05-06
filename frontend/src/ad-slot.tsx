import { useEffect, useRef } from "react"
import { useLocation } from "react-router"

const ADS_CLIENT = "ca-pub-6185202164526736"

// Slot IDs registered for softres.epoglogs.com in the AdSense dashboard.
// Add new placements here as the layout grows.
const ADS_SLOTS: Record<string, string> = {
  inContent: "",
  footer: "",
}

const SKIP_PATHS = /^\/(privacy|terms|about)\/?$/i

declare global {
  interface Window {
    // AdSense's loader monkey-patches .push on this array to actually request an
    // ad. Until the script loads, it's a plain array we can push pending configs
    // onto.
    adsbygoogle?: Record<string, unknown>[]
  }
}

export const AdSlot = (
  { placement, format = "auto" }: {
    placement: keyof typeof ADS_SLOTS
    format?: string
  },
) => {
  const location = useLocation()
  const ref = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  const slotId = ADS_SLOTS[placement]
  const skip = SKIP_PATHS.test(location.pathname)

  useEffect(() => {
    if (skip || !slotId || pushed.current || !ref.current) return
    try {
      const queue = window.adsbygoogle = window.adsbygoogle || []
      queue.push({})
      pushed.current = true
    } catch (_) {
      // AdSense script may not have loaded yet; another mount will retry.
    }
  }, [skip, slotId])

  if (skip || !slotId) return null

  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={ADS_CLIENT}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}
