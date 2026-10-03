import type { Destination } from './api'

export const posterImage = (code?: string | null) => `/destinations/${code ?? 'HOME'}.jpg`

/** Large rounded photo card for a destination; plays video on top when the destination has one. */
export function Poster({ destination }: { destination: Destination | null }) {
  return (
    <div className="poster" data-testid="poster">
      <img src={posterImage(destination?.code)} alt={destination ? `${destination.city}, ${destination.country}` : ''} />
      {destination?.videoUrl && <video src={destination.videoUrl} autoPlay muted loop playsInline />}
      {destination && <span className="poster-code">{destination.code}</span>}
    </div>
  )
}
