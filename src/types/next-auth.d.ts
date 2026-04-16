import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'viewer' | 'admin'
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: 'viewer' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'viewer' | 'admin'
  }
}
