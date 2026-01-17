# Order Views Feature - Implementation Summary

## Overview

The Order Views feature allows admins to create customizable views of order data displayed in a table format. Each view can filter and display specific order information, making it easy to analyze orders for specific products, variants, or statuses.

## Key Concept: Flattened Order Items

Unlike the standard Orders page which shows orders as cards (one card per order), the Views feature **flattens orders into individual cart items**. This means:

- **One row per cart item** in the table
- If an order contains 3 items, it will appear as 3 separate rows
- This makes it easy to analyze individual products/variants across all orders

## Architecture

### Database Layer (Convex)

**New Table: `views`**
```typescript
{
  name: string,                    // "Gala Ticket Orders"
  description?: string,            // Optional description
  columns: string[],               // ["email", "productName", "quantity"]
  filters?: {
    productIds?: Id<"products">[],
    variantIds?: string[],
    statuses?: string[],
  },
  sortBy?: string,                 // Column ID to sort by
  sortOrder?: "asc" | "desc",
}
```

**New Convex Functions (`convex/views.ts`)**
- `list()` - Get all views (admin only)
- `get(viewId)` - Get specific view (admin only)
- `create(...)` - Create new view (admin only)
- `update(viewId, ...)` - Update existing view (admin only)
- `remove(viewId)` - Delete view (admin only)
- `execute(viewId)` - Execute view and return flattened data (admin only)

### Frontend Layer (React)

**New Pages:**

1. **ViewsListPage** (`/views`)
   - Displays all views as cards
   - Shows view metadata (name, description, column count, filters)
   - Actions: View, Edit, Delete
   - "New View" button to create views

2. **ViewDetailPage** (`/views/:viewId`)
   - Displays the executed view as a table
   - Shows flattened order items (one row per cart item)
   - Export to CSV functionality
   - Edit button to modify view

3. **ViewEditorPage** (`/views/new` and `/views/:viewId/edit`)
   - Form to configure view settings
   - Column selection with checkboxes
   - Filter configuration:
     - Product filter (select specific products)
     - Variant filter (select specific variants)
     - Status filter (select order statuses)
   - Sorting configuration
   - Save/Cancel actions

**New Component:**
- **Table Component** (`src/components/ui/table.tsx`)
  - Generic table component following shadcn/ui patterns
  - Used for displaying view data

## Available Columns

Views can display the following columns:

| Column ID | Display Name | Description |
|-----------|--------------|-------------|
| `orderId` | Order ID | Unique order identifier |
| `orderCreationTime` | Order Date | When order was created |
| `email` | Email | Customer email |
| `name` | Name | Customer name |
| `orderStatus` | Order Status | Order status with badge |
| `productName` | Product Name | Name of the product |
| `variantName` | Variant Name | Name of the variant |
| `quantity` | Quantity | Number of items ordered |
| `price` | Price | Price per item |
| `itemTotal` | Item Total | Total for this item (price × quantity) |
| `customField_*` | Custom Fields | Any custom field responses |

## User Flow

### Creating a View

1. Admin navigates to `/views`
2. Clicks "New View" button
3. Fills in the form:
   - **Basic Info**: Name and description
   - **Columns**: Select which columns to display
   - **Filters** (optional):
     - Select specific products to include
     - Select specific variants to include
     - Select order statuses to include
   - **Sorting** (optional): Choose column and direction
4. Clicks "Create View"
5. Redirected to view detail page showing the table

### Viewing Order Data

1. Admin navigates to `/views/:viewId`
2. Table displays with configured columns
3. Each row represents one cart item from an order
4. Data is filtered and sorted as configured
5. Can export to CSV with one click
6. Can edit view configuration

### Example Use Cases

**Use Case 1: Gala Ticket Attendees**
- **Name**: "Gala 2026 Attendees"
- **Columns**: Email, Name, Variant Name, Custom Field (Dietary Restrictions)
- **Filters**: Product = "Gala 2026 Ticket"
- **Result**: List of all ticket purchasers with their dietary requirements

**Use Case 2: Completed Orders Report**
- **Name**: "Completed Orders"
- **Columns**: Order ID, Order Date, Email, Product Name, Quantity, Item Total
- **Filters**: Status = "completed"
- **Sort**: Order Date (descending)
- **Result**: Chronological list of all completed orders

**Use Case 3: T-Shirt Size Distribution**
- **Name**: "T-Shirt Sizes"
- **Columns**: Variant Name, Email, Quantity
- **Filters**: Product = "SIB T-Shirt"
- **Sort**: Variant Name (ascending)
- **Result**: List of all t-shirt orders grouped by size

## Security

- All view operations require admin authentication
- Uses `requireAdmin()` helper in all Convex functions
- Routes are wrapped with `<ProtectedRoute>` component
- No public access to view data

## Features

✅ **CRUD Operations**: Create, Read, Update, Delete views
✅ **Flexible Columns**: Choose which data to display
✅ **Multi-level Filtering**: Filter by products, variants, and statuses
✅ **Sorting**: Sort by any column in ascending/descending order
✅ **CSV Export**: Download view data as CSV
✅ **Custom Fields Support**: Display custom field responses
✅ **Responsive UI**: Works on desktop and mobile
✅ **Real-time Data**: Leverages Convex real-time subscriptions
✅ **Admin-only Access**: Secured with authentication

## Technical Decisions

### Why Flatten Orders?

Orders in the database are structured with an array of items. For analysis purposes, it's more useful to see each item as a separate row. This allows:
- Easier filtering by product/variant
- Per-item analysis
- Better CSV exports for spreadsheet analysis
- Simpler sorting by item properties

### Why In-Memory Filtering?

The current implementation fetches all orders and applies filters in memory. This is simple and works well for moderate data sizes. Future optimization could include:
- Database-level filtering (when Convex supports more complex queries)
- Pagination for large datasets
- Caching frequently-used views

### Why Separate Views Table?

Rather than generating views on-the-fly, we store them in the database because:
- Views can be reused and shared
- Configuration is persisted
- Easier to manage and edit
- Can add more features later (e.g., scheduled exports, alerts)

## Future Enhancements (Not Implemented)

Possible future improvements:
- [ ] Pagination for large datasets
- [ ] Search/filter within view results
- [ ] Scheduled exports (daily/weekly email)
- [ ] View templates or presets
- [ ] Share views with non-admin users (read-only)
- [ ] Charts and visualizations
- [ ] Aggregations (total revenue, item counts, etc.)
- [ ] Date range filters
- [ ] More export formats (Excel, PDF)

## Files Modified/Created

### Created Files
- `convex/views.ts` - View management functions
- `src/components/ui/table.tsx` - Table component
- `src/pages/ViewsListPage.tsx` - Views list page
- `src/pages/ViewDetailPage.tsx` - View detail page
- `src/pages/ViewEditorPage.tsx` - View editor page
- `VIEWS_TESTING.md` - Testing documentation
- `VIEWS_FEATURE.md` - This file

### Modified Files
- `convex/schema.ts` - Added views table
- `src/App.tsx` - Added view routes
- `src/components/layout/Header.tsx` - Added Views navigation link

## Code Quality

- ✅ TypeScript throughout with proper types
- ✅ Follows existing code patterns
- ✅ Uses established UI component patterns
- ✅ Proper error handling
- ✅ Admin authentication checks
- ✅ Responsive design
- ✅ Minimal dependencies (no new packages)

## Conclusion

The Order Views feature is fully implemented and ready for testing. It provides a flexible way for admins to create custom views of order data, with filtering, sorting, and export capabilities. The implementation follows best practices and integrates seamlessly with the existing codebase.
