# Testing the Order Views Feature

## Overview
The Order Views feature has been successfully implemented. This document outlines how to test the new functionality.

## What Was Implemented

### 1. Database Schema Changes
- Added `views` table to `convex/schema.ts` with the following fields:
  - `name`: View name
  - `description`: Optional description
  - `columns`: Array of column IDs to display
  - `filters`: Optional filters for products, variants, and order statuses
  - `sortBy`: Optional column to sort by
  - `sortOrder`: Sort direction (asc/desc)

### 2. Convex Functions (convex/views.ts)
- `list`: Query to list all views (admin only)
- `get`: Query to get a specific view by ID (admin only)
- `create`: Mutation to create a new view (admin only)
- `update`: Mutation to update an existing view (admin only)
- `remove`: Mutation to delete a view (admin only)
- `execute`: Query to execute a view and return flattened order items (admin only)

### 3. UI Components
- **Table Component** (`src/components/ui/table.tsx`): Generic table component for displaying data
- **ViewsListPage** (`src/pages/ViewsListPage.tsx`): Lists all views with cards
- **ViewDetailPage** (`src/pages/ViewDetailPage.tsx`): Displays a specific view as a table with export to CSV
- **ViewEditorPage** (`src/pages/ViewEditorPage.tsx`): Create/edit view with configuration options

### 4. Routes
- `/views` - List all views
- `/views/new` - Create new view
- `/views/:viewId` - Display a specific view
- `/views/:viewId/edit` - Edit a specific view

All routes are protected and require admin authentication.

### 5. Navigation
- Added "Views" link in header navigation (visible only when authenticated)

## Testing Instructions

### Prerequisites
1. Ensure you have Convex set up and running: `npx convex dev`
2. Ensure you're logged in as an admin user
3. Have some existing orders in the database

### Test Cases

#### 1. Create a New View
1. Navigate to `/views`
2. Click "New View" button
3. Fill in the form:
   - Name: "Gala Ticket Orders"
   - Description: "View all gala ticket orders"
   - Select columns: Order ID, Email, Name, Product Name, Variant Name, Quantity
   - Filter by specific products/variants (optional)
   - Filter by order status (optional)
   - Set sorting (optional)
4. Click "Create View"
5. Verify you're redirected to the view detail page

#### 2. View Order Data
1. On the view detail page, verify:
   - Table displays correctly with selected columns
   - Data is filtered according to the filters
   - Data is sorted according to the sort configuration
   - Each order item is shown as a separate row

#### 3. Export to CSV
1. On the view detail page, click "Export CSV"
2. Verify a CSV file is downloaded
3. Open the CSV file and verify:
   - Headers match the selected columns
   - Data is correctly formatted
   - All rows are present

#### 4. Edit a View
1. From the view detail page, click "Edit View"
2. Modify the configuration (e.g., add/remove columns, change filters)
3. Click "Update View"
4. Verify changes are reflected in the view

#### 5. Delete a View
1. Navigate to `/views`
2. Click the trash icon on a view card
3. Confirm deletion
4. Verify the view is removed from the list

#### 6. Test Filters
Create views with different filter combinations:
- Filter by specific products
- Filter by specific variants
- Filter by order status (e.g., only "completed" orders)
- Combine multiple filters

#### 7. Test Sorting
Create views with different sorting options:
- Sort by Order Date (ascending/descending)
- Sort by Email (alphabetically)
- Sort by Product Name
- Sort by Quantity

#### 8. Test Custom Fields (if applicable)
If products have custom fields:
1. Create a view that includes custom field columns
2. Verify custom field data is displayed correctly in the table

#### 9. Test Admin-Only Access
1. Log out
2. Try to access `/views` directly
3. Verify you're redirected or see an error

## Available Columns

The following columns can be displayed in views:
- Order ID
- Order Date (orderCreationTime)
- Email
- Name
- Order Status
- Product Name
- Variant Name
- Quantity
- Price (per item)
- Item Total (price × quantity)
- Custom Fields (if configured in products)

## Features Implemented

✅ View creation with custom column selection
✅ Filtering by products, variants, and order status
✅ Sorting by any column
✅ Table display of flattened order items (one row per cart item)
✅ CSV export functionality
✅ Admin-only access control
✅ Full CRUD operations for views
✅ Responsive UI with modern design
✅ Navigation integration in header

## Notes

- Views flatten orders into individual cart items, so each cart item appears as a separate row
- Custom field columns use the format `customField_<fieldId>`
- The view execution query applies filters in memory after fetching all orders
- All view operations require admin authentication
- Views are stored in the Convex database and persist across sessions
