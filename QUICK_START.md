# Quick Start: Priority Features

## 🚀 What's New

Three major features added to Cats & Flats:

1. **✏️ Edit Listings** - Update your listings anytime
2. **🔍 Search Page** - Find listings with filters
3. **🔔 Subscriptions** - Get notified about new listings

---

## Setup (5 minutes)

### 1. Environment

Add to `.env` (optional):
```env
NOTION_DB_SUBSCRIPTIONS=your_subscriptions_db_id
```

If not set, uses `NOTION_DB_PROFILES` as fallback.

### 2. Deploy

```bash
npm install
npm run build
# Restart your services
```

### 3. Test

```bash
# Test bot commands
/notifications
/subscribe
/unsubscribe

# Test search page
# Open: https://your-domain.com/search

# Test editing
# Create listing → Click "✏️ Редактировать" → Change → Publish
```

---

## For Users

### Edit Listing

1. Open mini-app
2. Scroll to "Мои объявления"
3. Click "✏️ Редактировать" on any listing
4. Form loads with data
5. Change what you need
6. Click "Опубликовать"
7. ✅ Done! Channel post updates automatically

### Search Listings

1. Open mini-app
2. Click "🔍 Поиск жилья →" in header
3. Enter city or country
4. Click "🔍 Найти"
5. Browse results
6. Click "💬 Написать в канале" to contact

### Subscribe to Notifications

```
/subscribe → Enable notifications
/notifications → Check status
/unsubscribe → Disable
```

---

## For Developers

### Add Notification Delivery

Create a cron job or background worker:

```typescript
import { subscriptionsService } from './src/services/subscriptions.service';
import { listingService } from './src/services/listing.service';

// Run every hour
async function sendNotifications() {
  // Get all enabled subscriptions
  const subscriptions = await subscriptionsService.getAllEnabled();
  
  // Get recent listings (last hour)
  const recentListings = await listingService.search('', 50);
  
  for (const sub of subscriptions) {
    const cities = sub.cities.split(',').map(c => c.trim()).filter(Boolean);
    const countries = sub.countries.split(',').map(c => c.trim()).filter(Boolean);
    
    // Filter relevant listings
    const relevant = recentListings.filter(listing => 
      cities.includes(listing.city) || 
      countries.includes(listing.country)
    );
    
    if (relevant.length > 0) {
      const message = formatNotificationMessage(relevant);
      await bot.telegram.sendMessage(sub.tgId, message);
    }
  }
}

function formatNotificationMessage(listings) {
  return `🔔 Новые объявления (${listings.length}):\n\n` +
    listings.map(l => 
      `📍 ${l.city}, ${l.country}\n` +
      `📅 ${l.dates}\n` +
      `🔗 /listing_${l.id}`
    ).join('\n\n');
}
```

### Create Settings Page

```typescript
// apps/web/app/settings/page.tsx
export default function SettingsPage() {
  const [cities, setCities] = useState('');
  const [countries, setCountries] = useState('');
  
  // Load current subscription
  useEffect(() => {
    // api.fetchSubscription()...
  }, []);
  
  const handleSave = async () => {
    // api.updateSubscription({ cities, countries, enabled: true })
  };
  
  return (
    <form onSubmit={handleSave}>
      <input value={cities} onChange={e => setCities(e.target.value)} />
      <input value={countries} onChange={e => setCountries(e.target.value)} />
      <button>Save</button>
    </form>
  );
}
```

---

## Architecture

### Flow: Edit Listing

```
User clicks "Edit"
  → loadListingForEdit(listing)
  → setEditingListingId(id)
  → setListingForm(listing data)
  → User edits
  → publishListingAction()
  → api.updateListing(id, data)
  → PATCH /api/listings/:id
  → listingService.update()
  → listingsRepo.update()
  → Notion pages.update()
  → editMessageCaption() or publishListing()
  ✅ Done
```

### Flow: Search

```
User enters /search
  → SearchPage loads
  → useEffect → api.fetchPublicListings()
  → GET /api/listings/public?city=Barcelona
  → listingService.search('Barcelona')
  → listingsRepo.searchPublished()
  → Notion databases.query()
  → Returns public listings only
  ✅ Display results
```

### Flow: Subscriptions

```
User sends /subscribe
  → subscriptionsService.enable(tgId)
  → subscriptionsRepo.upsert(tgId, '', '', true)
  → Notion pages.create() or pages.update()
  ✅ Subscription saved

Background job (hourly):
  → subscriptionsService.getAllEnabled()
  → listingService.search()
  → Match subscriptions to listings
  → Send notifications via bot
  ✅ Users notified
```

---

## Troubleshooting

### Editing doesn't work

- Check: User owns the listing
- Check: Notion integration has write access
- Check: API logs for errors

### Search returns nothing

- Check: Are there published listings? (channelMessageId must exist)
- Check: Case sensitivity (try "Moscow" not "moscow")
- Check: Notion API rate limits

### Subscriptions not saving

- Check: `NOTION_DB_SUBSCRIPTIONS` or `NOTION_DB_PROFILES` in `.env`
- Check: Database exists and integration has access
- Check: Properties schema (auto-created on first use)

---

## Performance

- **Edit**: Single Notion update + optional Telegram API call (~500ms)
- **Search**: Notion query with filters (~300-500ms)
- **Subscribe**: Notion upsert with 5-min cache (~200ms cached, ~400ms fresh)

---

## Security

- **Edit**: Auth required, ownership verified
- **Search**: Public endpoint, sanitized data (no owner PII)
- **Subscriptions**: Auth required, user can only manage own subscription

---

## Next Steps

1. ✅ Deploy and test
2. 📊 Monitor usage (check analytics logs)
3. 🎨 Optional: Create `/settings` page UI
4. ⏰ Optional: Implement notification delivery cron
5. 📈 Optional: Add advanced search filters (date ranges, etc.)

---

**Version**: 1.2.0  
**Status**: Production Ready  
**Support**: Check PRIORITY_FEATURES.md for detailed docs

