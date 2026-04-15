import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'viewer' | 'editor' | 'admin'
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: 'viewer' | 'editor' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'viewer' | 'editor' | 'admin'
  }
}
