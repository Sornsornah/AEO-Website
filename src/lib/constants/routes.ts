export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ABOUT: '/about',

  UPDATES: '/updates',
  UPDATE: (id: string) => `/updates/${id}`,
  SAVED: '/saved',

  BLOG: '/blog',
  BLOG_POST: (slug: string) => `/blog/${slug}`,

  PRODUCTS: '/products',
  PRODUCT: (slug: string) => `/products/${slug}`,

  EDITOR: '/editor',
  EDITOR_NEW: '/editor/new',
  EDITOR_UPDATE: (id: string) => `/editor/${id}`,
  EDITOR_BLOG_NEW: '/editor/blog/new',
  EDITOR_BLOG: (id: string) => `/editor/blog/${id}`,
  EDITOR_PRODUCT: (id: string) => `/editor/products/${id}`,

  ADMIN: '/admin',

  API: {
    AUTH_OTP: '/api/auth/otp',
    UPDATES: '/api/updates',
    UPDATE: (id: string) => `/api/updates/${id}`,
    BLOG: '/api/blog',
    BLOG_POST: (slug: string) => `/api/blog/${slug}`,
    PRODUCTS: '/api/products',
    DOMAINS: '/api/domains',
    UPLOADS: '/api/uploads',
    NOTIFICATIONS: '/api/notifications',
    PAGE_SETTINGS: '/api/page-settings',
    ADMIN_USERS: '/api/admin/users',
    ADMIN_TAGS: '/api/admin/tags',
    ADMIN_BLOG_CATEGORIES: '/api/admin/blog-categories',
    ADMIN_PAGE_SETTINGS: '/api/admin/page-settings',
    ADMIN_LOGS: '/api/admin/logs',
  },
} as const
