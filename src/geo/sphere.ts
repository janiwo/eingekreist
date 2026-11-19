import type { LngLat } from '../game/types'

/** Mean Earth radius (km), same value as Turf. */
export const EARTH_RADIUS_KM = 6371.0088

/** Half the Earth's circumference: the largest possible distance between two points. */
export const HALF_CIRCUMFERENCE_KM = Math.PI * EARTH_RADIUS_KM

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/** Wraps a longitude into [-180, 180). */
export function normalizeLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

/** Great-circle distance in km (haversine). */
export function distanceKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from `from` to `to`, in degrees clockwise from north. */
export function bearingDeg([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return toDeg(Math.atan2(y, x))
}

/** Point reached by travelling `km` from `origin` along `bearing` (degrees). */
export function destination([lng, lat]: LngLat, km: number, bearing: number): LngLat {
  const δ = km / EARTH_RADIUS_KM
  const θ = toRad(bearing)
  const φ1 = toRad(lat)
  const λ1 = toRad(lng)
  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)))
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    )
  return [normalizeLng(toDeg(λ2)), toDeg(φ2)]
}
