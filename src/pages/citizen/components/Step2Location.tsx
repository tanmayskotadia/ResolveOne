import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import type { Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Button, Input } from '../../../components/ui'
import { Spinner } from '../../../components/ui/Spinner'
import type { ComplaintData } from '../../../types/complaint'
import { useTheme } from '../../../context/ThemeContext'
import L from 'leaflet'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface Step2Props {
  data: ComplaintData
  onChange: (updates: Partial<ComplaintData>) => void
  onNext: () => void
  onBack: () => void
}

// Default center (e.g. Ahmedabad) if geolocation fails or before it loads
const DEFAULT_CENTER: [number, number] = [23.0225, 72.5714]

function MapEvents({ onLocation }: { onLocation: (lat: number, lng: number) => void }) {
  useMapEvents({ click: event => onLocation(event.latlng.lat, event.latlng.lng) })
  return null
}

export function Step2Location({ data, onChange, onNext, onBack }: Step2Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loadingLoc, setLoadingLoc] = useState(data.lat === null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [reversing, setReversing] = useState(false)
  const markerRef = useRef<LeafletMarker>(null)
  const reverseRequest = useRef<AbortController | null>(null)
  useEffect(() => () => reverseRequest.current?.abort(), [])

  // Use useMemo to prevent re-initializing center map randomly
  const center = useMemo<[number, number]>(() => {
    if (data.lat !== null && data.lng !== null) return [data.lat, data.lng]
    return DEFAULT_CENTER
  }, [data.lat, data.lng])

  useEffect(() => {
    let cancelled = false
    // If we already have a location, don't ask again
    if (data.lat !== null && data.lng !== null) {
      setLoadingLoc(false)
      return
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.')
      setLoadingLoc(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        onChange({ lat, lng, address: '' })
        reverseGeocode(lat, lng)
        setLoadingLoc(false)
      },
      (err) => {
        if (cancelled) return
        console.warn('Geolocation error:', err)
        setGeoError('Could not get your exact location. Please drag the pin on the map.')
        setLoadingLoc(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
    return () => { cancelled = true; reverseRequest.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reverseGeocode = async (lat: number, lng: number) => {
    reverseRequest.current?.abort()
    const controller = new AbortController()
    reverseRequest.current = controller
    setReversing(true)
    setGeoError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) },
      )
      if (!res.ok) throw new Error('Network response was not ok')
      const result = await res.json()
      if (!result?.display_name) throw new Error('No address found')
      if (!controller.signal.aborted && result?.display_name) {
        onChange({ address: result.display_name })
      }
    } catch {
      if (!controller.signal.aborted) setGeoError('Address lookup failed. Enter the address manually for the selected pin.')
    } finally {
      if (!controller.signal.aborted) setReversing(false)
    }
  }

  function selectLocation(lat: number, lng: number) {
    onChange({ lat, lng, address: '' })
    void reverseGeocode(lat, lng)
  }

  const handleDragEnd = () => {
    const marker = markerRef.current
    if (marker != null) {
      const { lat, lng } = marker.getLatLng()
      selectLocation(lat, lng)
    }
  }

  const hasLocation = data.lat !== null && data.lng !== null && Number.isFinite(data.lat) && Number.isFinite(data.lng) && Math.abs(data.lat) <= 90 && Math.abs(data.lng) <= 180
  const isNextDisabled = !hasLocation || !data.address.trim() || reversing

  return (
    <div className="space-y-6 animate-fade-in">
      <Card noPadding className={isDark ? '!bg-navy-900 !border-navy-800 overflow-hidden' : 'overflow-hidden'}>
        {loadingLoc ? (
          <div className={`h-64 flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
            <Spinner />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Getting your location...</p>
          </div>
        ) : (
          <div className="h-80 w-full relative z-0">
            <MapContainer
              center={center}
              zoom={15}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapEvents onLocation={selectLocation} />
              {hasLocation && (
                <Marker
                  draggable={true}
                  eventHandlers={{ dragend: handleDragEnd }}
                  position={[data.lat!, data.lng!]}
                  ref={markerRef}
                  icon={DefaultIcon}
                />
              )}
            </MapContainer>
            
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 backdrop-blur shadow-sm px-4 py-2 rounded-full text-xs font-medium pointer-events-none z-[1000] border ${isDark ? 'bg-navy-900/90 text-slate-300 border-navy-700' : 'bg-white/90 text-slate-700 border-slate-200'}`}>
              Drag the marker or tap map to adjust
            </div>
          </div>
        )}
      </Card>

      {geoError && !loadingLoc && (
        <div className={`p-3 text-sm rounded-lg border ${isDark ? 'bg-amber-950/30 text-amber-400 border-amber-900/50' : 'bg-amber-50 text-warning border-amber-200'}`}>
          {geoError}
        </div>
      )}

      <Card className={isDark ? '!bg-navy-900 !border-navy-800' : ''}>
        <div className="space-y-4">
          <Input
            id="address"
            maxLength={2000}
            label="Address"
            placeholder="Fetching address..."
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            required
            disabled={reversing}
            rightAdornment={reversing && <Spinner size="sm" />}
            helperText="You can manually edit the address if needed"
          />
          <div className={`flex gap-4 text-xs font-mono p-2 rounded-lg border ${isDark ? 'bg-navy-950 text-slate-400 border-navy-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            <div>Lat: {data.lat?.toFixed(5) || '-'}</div>
            <div>Lng: {data.lng?.toFixed(5) || '-'}</div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={isNextDisabled}>
          Next Step
        </Button>
      </div>
    </div>
  )
}
