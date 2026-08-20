import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Badge, Button, Card } from '../../../components/ui'
import { shortCode } from '../../citizen/components/ComplaintCard'
import type { ComplaintRow } from '../../../types/complaint'

// Custom Leaflet Icons using standard marker and CSS filters
// By default Leaflet icons don't load well in Vite without this trick or importing images
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const baseIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// Define a style tag to apply filters to markers based on class names
const markerStyles = `
  .marker-submitted { filter: hue-rotate(150deg); } /* Redish */
  .marker-in_progress { filter: hue-rotate(190deg); } /* Orangeish */
  .marker-resolved { filter: hue-rotate(270deg); } /* Greenish */
  .marker-open { filter: hue-rotate(150deg); } 
  .marker-rejected { filter: grayscale(100%); }
`

interface AuthorityComplaintsMapProps {
  complaints: ComplaintRow[]
  onSelect: (complaint: ComplaintRow) => void
}

const statusBadgeMap: Record<string, any> = {
  submitted: 'pending',
  open: 'open',
  in_progress: 'in_progress',
  resolved: 'resolved',
  rejected: 'rejected',
}

export function AuthorityComplaintsMap({ complaints, onSelect }: AuthorityComplaintsMapProps) {
  const mapCenter = useMemo<[number, number]>(() => {
    // Center on the first complaint with a location, or default to Ahmedabad
    const firstWithLoc = complaints.find(c => c.lat !== null && c.lng !== null)
    if (firstWithLoc && firstWithLoc.lat && firstWithLoc.lng) {
      return [firstWithLoc.lat, firstWithLoc.lng]
    }
    return [23.0225, 72.5714]
  }, [complaints])

  const validComplaints = complaints.filter(c => c.lat !== null && c.lng !== null)

  return (
    <Card noPadding className="h-[600px] w-full overflow-hidden relative z-0 animate-fade-in border border-slate-200">
      <style>{markerStyles}</style>
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validComplaints.map(c => {
          // Create a new icon instance for each marker to apply the custom CSS class
          const statusIcon = new L.Icon({
            ...baseIcon.options,
            className: `marker-${c.status}`
          })

          return (
            <Marker 
              key={c.id} 
              position={[c.lat!, c.lng!]}
              icon={statusIcon}
            >
              <Popup className="custom-popup rounded-xl">
                <div className="w-64">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-slate-500">{shortCode(c.id)}</span>
                    <Badge variant={statusBadgeMap[c.status] || 'default'} size="sm" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{c.category}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {c.description}
                  </p>
                  <Button 
                    fullWidth 
                    size="sm" 
                    onClick={() => {
                      // Note: Leaflet popups don't always play perfectly with React state in onClick
                      // if they are unmounted, but this usually works fine.
                      onSelect(c)
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-md rounded-xl p-3 z-[1000] border border-slate-200">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Status Legend</p>
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Submitted / Open</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div>In Progress</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>Resolved</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div>Rejected</div>
        </div>
      </div>
    </Card>
  )
}
