import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

// Inline schemas to avoid model registration conflicts
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'viewer' },
  isWhitelisted: { type: Boolean, default: false },
}, { timestamps: true })

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  color: { type: String, default: '#6366f1' },
}, { timestamps: true })

const UpdateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  date: { type: Date, required: true },
  highlights: [String],
  isPublished: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

async function seed() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)

  const User = mongoose.model('User', UserSchema)
  const Product = mongoose.model('Product', ProductSchema)
  const Update = mongoose.model('Update', UpdateSchema)

  // Clear existing seed data
  await User.deleteMany({ email: { $in: ['editor@updatecentral.com', 'viewer@updatecentral.com'] } })
  await Product.deleteMany({ slug: { $in: ['mobile-app', 'web-platform', 'api'] } })
  await Update.deleteMany({})

  console.log('Seeding users...')
  const editor = await User.create({
    email: 'editor@updatecentral.com',
    name: 'Alex Editor',
    role: 'editor',
    isWhitelisted: true,
  })

  await User.create({
    email: 'viewer@updatecentral.com',
    name: 'CEO Viewer',
    role: 'viewer',
    isWhitelisted: true,
  })

  console.log('Seeding products...')
  const mobileApp = await Product.create({
    name: 'Mobile App',
    slug: 'mobile-app',
    description: 'iOS and Android mobile application',
    color: '#6366f1',
  })

  const webPlatform = await Product.create({
    name: 'Web Platform',
    slug: 'web-platform',
    description: 'Core web application and dashboard',
    color: '#10b981',
  })

  const api = await Product.create({
    name: 'API',
    slug: 'api',
    description: 'Public and internal API services',
    color: '#f59e0b',
  })

  console.log('Seeding updates...')

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  await Update.create([
    {
      title: 'Redesigned Home Screen & Personalized Feed',
      summary: 'The mobile app home screen has been completely redesigned with a personalized activity feed, smarter notifications, and improved navigation.',
      content: `## What Changed

We've completely overhauled the home screen experience based on feedback from thousands of users.

### Personalized Feed
The new home screen now shows a personalized feed based on your usage patterns and preferences. Items you interact with most often will surface higher.

### Smarter Notifications
Notification grouping now reduces noise by batching similar alerts. You can configure per-category notification frequency from Settings.

### Navigation Improvements
- Bottom tab bar re-ordered based on usage data
- Quick-access shortcuts added to the top of the feed
- Search now includes fuzzy matching for better results

## Technical Notes
These changes required significant backend work to support real-time personalization. API response times for the feed endpoint improved by 40%.`,
      productId: mobileApp._id,
      date: daysAgo(5),
      highlights: [
        'Personalized home feed based on usage patterns',
        'Notification grouping reduces noise by up to 60%',
        '40% faster feed API response times',
        'Redesigned bottom navigation with quick-access shortcuts',
      ],
      isPublished: true,
      createdBy: editor._id,
    },
    {
      title: 'Analytics Dashboard V2',
      summary: 'The web platform now features a fully rebuilt analytics dashboard with real-time data, custom date ranges, and new chart types.',
      content: `## Analytics Dashboard V2

After 3 months of development, we're shipping a completely new analytics experience.

### Real-Time Data
Data now updates every 30 seconds without requiring a page refresh. A subtle pulse indicator shows when data was last updated.

### Custom Date Ranges
Select any date range for your reports — not just the preset options. Compare periods side-by-side.

### New Chart Types
- **Funnel charts** for conversion analysis
- **Cohort tables** for retention analysis
- **Heatmaps** for engagement patterns

### Export Improvements
Export to CSV, Excel, or PDF directly from any chart. Scheduled email reports are now available in the Pro plan.`,
      productId: webPlatform._id,
      date: daysAgo(12),
      highlights: [
        'Real-time data updates every 30 seconds',
        'Custom date range selector with period comparison',
        'New funnel, cohort, and heatmap chart types',
        'Export to CSV, Excel, PDF — plus scheduled email reports',
      ],
      isPublished: true,
      createdBy: editor._id,
    },
    {
      title: 'API v3.0: GraphQL Support & Webhooks',
      summary: 'API v3 introduces a full GraphQL endpoint alongside the existing REST API, plus a redesigned webhooks system with retry logic.',
      content: `## API v3.0 Release

This is our biggest API update in two years.

### GraphQL Endpoint
Available at \`/api/v3/graphql\`. Supports queries, mutations, and subscriptions. The schema is fully documented in our developer portal.

**Key benefits:**
- Request exactly the fields you need — no over-fetching
- Batch multiple requests in a single round trip
- Real-time subscriptions for live data

### Webhooks Redesign
The new webhooks system includes:
- Configurable retry logic (up to 5 retries with exponential backoff)
- Delivery logs with request/response inspection
- Webhook signing for security verification
- Test mode to simulate events without affecting production data

### REST API Still Fully Supported
REST API v2 will remain supported until December 2025. Migration guides are available in the docs.`,
      productId: api._id,
      date: daysAgo(20),
      highlights: [
        'Full GraphQL endpoint at /api/v3/graphql with subscriptions',
        'Redesigned webhooks with retry logic and delivery logs',
        'Webhook signing for enhanced security',
        'REST API v2 supported until December 2025',
      ],
      isPublished: true,
      createdBy: editor._id,
    },
    {
      title: 'Offline Mode & Background Sync',
      summary: 'The mobile app can now be used without an internet connection. Changes sync automatically when connectivity is restored.',
      content: `## Offline Mode

You can now use the app fully offline. Here's what's supported:

### What Works Offline
- Browse and search your content library
- Create and edit items (synced when back online)
- View previously loaded data
- Add to favorites and personal lists

### Background Sync
When you reconnect, the app syncs in the background using an intelligent conflict resolution system. In the rare case of a conflict, you'll be shown a clear comparison and asked to choose.

### Data Caching
The app now caches the most recently viewed content for instant offline access. Cache size is configurable (default: 500MB).`,
      productId: mobileApp._id,
      date: daysAgo(35),
      highlights: [
        'Full offline browsing and content editing',
        'Automatic background sync with conflict resolution',
        'Configurable cache size (default 500MB)',
        'Available on iOS 16+ and Android 10+',
      ],
      isPublished: true,
      createdBy: editor._id,
    },
    {
      title: 'Team Workspaces & Shared Dashboards',
      summary: 'Organizations can now create team workspaces with shared dashboards, role-based access, and collaborative annotations.',
      content: `## Team Workspaces

Organizations on the Business and Enterprise plans can now create shared team workspaces.

### Shared Dashboards
Create dashboards once and share them with your entire team. Viewers see live data; editors can modify the layout and add charts.

### Role-Based Access Control
Each workspace supports three roles:
- **Owner**: Full control, manages membership
- **Editor**: Can create and modify content
- **Viewer**: Read-only access

### Collaborative Annotations
Leave comments on any chart or data point. Tag teammates with \`@mentions\`. Comments support Markdown formatting.

### Activity Feed
A dedicated workspace activity feed shows what teammates have viewed, modified, or commented on.`,
      productId: webPlatform._id,
      date: daysAgo(48),
      highlights: [
        'Team workspaces for Business and Enterprise plans',
        'Three-tier RBAC: Owner, Editor, Viewer',
        'Collaborative annotations with @mentions on any chart',
        'Workspace activity feed',
      ],
      isPublished: true,
      createdBy: editor._id,
    },
    {
      title: 'Rate Limiting & API Key Management V2',
      summary: 'New granular rate limits per endpoint, a redesigned API key management UI, and per-key usage analytics.',
      content: `## Rate Limiting & API Key Management

### Granular Rate Limits
Rate limits are now configurable per endpoint category rather than a single global limit. Default limits have also been increased for Pro and Enterprise plans.

### API Key Management V2
The developer portal has a completely new API key management interface:
- Create keys with specific permission scopes
- Set expiration dates on keys
- View per-key usage analytics and cost attribution
- Rotate keys with zero downtime using our overlap period feature

### IP Allowlisting
Enterprise customers can now restrict API access to specific IP ranges per key.`,
      productId: api._id,
      date: daysAgo(60),
      highlights: [
        'Per-endpoint rate limit configuration',
        'API keys with scopes, expiration, and usage analytics',
        'Zero-downtime key rotation',
        'IP allowlisting for Enterprise customers',
      ],
      isPublished: true,
      createdBy: editor._id,
    },
    {
      title: 'Dark Mode & Accessibility Improvements',
      summary: 'System dark mode support, high-contrast themes, and WCAG AA compliance across the entire app.',
      content: `## Dark Mode & Accessibility

### System Dark Mode
The app now automatically follows your device's dark/light mode setting. You can also manually override in Settings > Appearance.

### High Contrast Theme
A new high-contrast theme option is available for users with visual impairments.

### WCAG AA Compliance
All screens have been audited and updated to meet WCAG 2.1 AA standards:
- Color contrast ratios meet or exceed 4.5:1
- All interactive elements are keyboard accessible
- Screen reader support improved across all screens
- Focus indicators visible in all themes`,
      productId: mobileApp._id,
      date: daysAgo(75),
      highlights: [
        'System dark mode with manual override',
        'High-contrast theme for accessibility',
        'Full WCAG 2.1 AA compliance',
        'Improved screen reader support',
      ],
      isPublished: false,
      createdBy: editor._id,
    },
  ])

  console.log('✓ Seed complete!')
  console.log('')
  console.log('Test accounts (sign in via OTP at /login):')
  console.log('  Editor:  editor@updatecentral.com')
  console.log('  Viewer:  viewer@updatecentral.com')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
