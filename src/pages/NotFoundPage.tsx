import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-9xl mb-4">🗺️</div>
        <h1 className="text-4xl font-extrabold text-slate-800">404</h1>
        <p className="text-lg text-slate-600">
          Looks like you've navigated off the map. This page doesn't exist.
        </p>
        <Link to="/" className="inline-block pt-4">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    </div>
  )
}
