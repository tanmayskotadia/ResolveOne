export type Role = 'citizen' | 'authority'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  created_at: string
}
