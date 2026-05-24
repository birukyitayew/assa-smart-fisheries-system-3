import { useState } from 'react'
import api from '../services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, UserPlus, Info } from 'lucide-react'

export default function UsersPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('fisher')
  const [phone, setPhone] = useState('')
  
  // Fisher specific fields
  const [licenseNumber, setLicenseNumber] = useState('')
  const [boatName, setBoatName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [capacityKg, setCapacityKg] = useState('500')

  // Buyer specific fields
  const [location, setLocation] = useState('Bahir Dar')

  // Status indicators
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(null)
    setError(null)

    const payload = {
      name,
      email,
      password,
      role,
      phone: phone || null,
    }

    if (role === 'fisher') {
      payload.licenseNumber = licenseNumber || null
      payload.boatName = boatName || null
      payload.registrationNumber = registrationNumber || null
      payload.capacityKg = Number(capacityKg) || null
    } else if (role === 'buyer') {
      payload.location = location || null
    }

    try {
      const res = await api.post('/admin/users', payload)
      if (res.data.success) {
        setSuccess(`User "${name}" created successfully as ${role.toUpperCase()}!`)
        // Reset form fields
        setName('')
        setEmail('')
        setPassword('')
        setPhone('')
        setLicenseNumber('')
        setBoatName('')
        setRegistrationNumber('')
        setCapacityKg('500')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          Onboard New Platform User
        </h2>
        <p className="text-sm text-muted-foreground">
          Register new fishers, inspectors, buyers, or administrative users onto the ASSA system.
        </p>
      </div>

      {success && (
        <div className="flex gap-3 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Success</div>
            <div className="text-sm opacity-90">{success}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Error</div>
            <div className="text-sm opacity-90">{error}</div>
          </div>
        </div>
      )}

      <Card className="shadow-lg border-border/60 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Enter name, email, credentials, and select account role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Abebe Kebede"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. abebe@fisher.et"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. +251912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="fisher">Fisherman / Co-op Member</option>
                <option value="inspector">Inspector / Port Authority</option>
                <option value="buyer">Marketplace Buyer / Restaurant</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Fisher Specific Profile Section */}
            {role === 'fisher' && (
              <div className="mt-4 p-4 border border-border/80 rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Info className="h-4 w-4" />
                  Fisherman & Vessel Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">License Number</label>
                    <Input
                      type="text"
                      placeholder="e.g. LIC-998822 (auto-generated if empty)"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Boat Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Tanash-1"
                      value={boatName}
                      onChange={(e) => setBoatName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vessel Reg Number</label>
                    <Input
                      type="text"
                      placeholder="e.g. REG-08241 (auto-generated if empty)"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vessel Capacity (kg)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={capacityKg}
                      onChange={(e) => setCapacityKg(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Buyer Specific Profile Section */}
            {role === 'buyer' && (
              <div className="mt-4 p-4 border border-border/80 rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Info className="h-4 w-4" />
                  Buyer Information
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketplace Location / City</label>
                  <Input
                    type="text"
                    placeholder="e.g. Bahir Dar, Gondar, Woreta"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full font-medium">
              {loading ? 'Registering User...' : 'Onboard User & Create Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
