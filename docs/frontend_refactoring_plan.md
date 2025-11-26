# Frontend Refactoring Implementation Plan

## Goal Description
Refactor the React frontend to improve code reusability, maintainability, and consistency by implementing custom hooks, reusable components, and better state management patterns.

## Current State Analysis

### Architecture
- **Framework**: React 19.2.0 with React Router 7.9.6
- **UI Library**: Tailwind CSS 4.0.0 (via CDN) + Shadcn UI components
- **State Management**: Context API (Auth, API, Permission, Notification, Company)
- **Form Handling**: React Hook Form 7.66.1 + Zod validation (replacing Yup)
- **Build Tool**: Vite 7.0.7
- **Icons**: Lucide React (Shadcn UI default)
- **Total Pages**: 48 page components

### Identified Issues

#### 1. **Code Duplication**
- CRUD operations repeated in every page (Products, Customers, Suppliers, etc.)
- Pagination logic duplicated across multiple components
- Form handling patterns inconsistent
- API error handling scattered throughout components

#### 2. **Lack of Reusable Hooks**
- No custom hooks for common operations (CRUD, pagination, search)
- Direct API calls in components instead of abstracted hooks
- State management logic mixed with UI logic

#### 3. **Component Structure**
- Large monolithic page components (700+ lines)
- Business logic tightly coupled with UI
- No separation between container and presentational components

#### 4. **Inconsistent Patterns**
- Mixed use of `useState` for forms vs React Hook Form
- Inconsistent error handling approaches
- Different pagination implementations across pages

## User Review Required

> [!IMPORTANT]
> This refactoring will significantly change the frontend codebase structure. While the UI will remain the same, the internal code organization will be completely restructured.
> 
> **Breaking Change Risk**: Low - UI and functionality will remain identical.
> 
> **Benefits**:
> - 60-70% reduction in code duplication
> - Faster development of new features
> - Easier maintenance and bug fixes
> - Better testability

## Proposed Changes

### Phase 0: UI Library Migration

#### Setup Tailwind CSS via CDN
Add Tailwind CSS CDN to `resources/views/app.blade.php`:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#0d6efd',
          secondary: '#6c757d',
          success: '#198754',
          danger: '#dc3545',
          warning: '#ffc107',
          info: '#0dcaf0',
        }
      }
    }
  }
</script>
```

#### Setup Shadcn UI via MCP Server
Use Shadcn UI MCP server to install components:

```bash
# Install required dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-toast

# Setup utils
mkdir -p resources/js/lib
# Create utils.js for cn() function
```

#### [NEW] `lib/utils.js`
Utility for merging Tailwind classes:

```javascript
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

#### Shadcn UI Components to Install
Via MCP server or manual installation:
- `Button` - Replace Bootstrap buttons
- `Card` - Replace Bootstrap cards
- `Table` - Replace Bootstrap tables
- `Dialog` - Replace Bootstrap modals
- `Input` - Replace Bootstrap form controls
- `Select` - Replace Bootstrap selects
- `Badge` - Replace Bootstrap badges
- `Toast` - For notifications
- `Dropdown Menu` - For action menus
- `Pagination` - Custom pagination component

---

### Phase 1: Custom Hooks Layer

#### [NEW] `hooks/useCRUD.js`
Generic hook for CRUD operations with built-in loading, error handling, and pagination.

```javascript
const { 
  items, 
  loading, 
  error, 
  pagination,
  create, 
  update, 
  remove,
  fetchItems,
  setPage 
} = useCRUD('/products');
```

#### [NEW] `hooks/useSearch.js`
Debounced search hook with auto-suggestion support.

```javascript
const { 
  searchTerm, 
  setSearchTerm, 
  suggestions, 
  searching 
} = useSearch('/products/search', { debounce: 300 });
```

#### [NEW] `hooks/useForm.js`
Enhanced form hook wrapping React Hook Form with common validation patterns.

```javascript
const { 
  formData, 
  errors, 
  handleSubmit, 
  reset 
} = useForm(schema, { onSuccess, onError });
```

#### [NEW] `hooks/usePagination.js`
Reusable pagination logic.

```javascript
const { 
  currentPage, 
  totalPages, 
  goToPage, 
  nextPage, 
  prevPage 
} = usePagination(totalItems, itemsPerPage);
```

#### [NEW] `hooks/useModal.js`
Modal state management hook.

```javascript
const { 
  isOpen, 
  open, 
  close, 
  toggle 
} = useModal();
```

---

### Phase 2: Reusable UI Components (Using Shadcn UI)

#### [NEW] `components/ui/*` (Shadcn UI Components)
Install via MCP server or manually:
- `Button.jsx` - Styled button component
- `Card.jsx` - Card container
- `Table.jsx` - Table component
- `Dialog.jsx` - Modal dialogs
- `Input.jsx` - Form inputs
- `Select.jsx` - Select dropdowns
- `Badge.jsx` - Status badges
- `Toast.jsx` - Toast notifications

#### [NEW] `components/common/DataTable.jsx`
Generic data table using Shadcn Table component.

**Example**:
```jsx
<DataTable
  columns={[
    { header: "SKU", accessorKey: "sku" },
    { header: "Name", accessorKey: "name" },
    { header: "Stock", accessorKey: "stock" }
  ]}
  data={products}
  onRowClick={handleRowClick}
/>
```

#### [NEW] `components/common/Pagination.jsx`
Pagination using Shadcn UI primitives.

**Example**:
```jsx
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={setPage}
/>
```

#### [NEW] `components/common/SearchBar.jsx`
Search with Command palette style (Shadcn).

**Example**:
```jsx
<SearchBar
  placeholder="Search products..."
  onSearch={handleSearch}
  suggestions={suggestions}
/>
```

#### [NEW] `components/common/FormDialog.jsx`
Dialog for forms using Shadcn Dialog.

**Example**:
```jsx
<FormDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Add Product"
>
  <ProductForm onSubmit={handleSubmit} />
</FormDialog>
```

#### [NEW] `components/common/StatsCard.jsx`
Stats card with Tailwind styling.

**Example**:
```jsx
<StatsCard
  title="Total Products"
  value={150}
  icon={<Package />}
  trend="+12%"
  className="bg-blue-50"
/>
```

---

### Phase 3: Feature-Specific Components

#### [NEW] `components/products/ProductForm.jsx`
Dedicated product form component (extracted from Products.jsx).

#### [NEW] `components/products/ProductTable.jsx`
Product-specific table with custom columns.

#### [NEW] `components/products/ProductFilters.jsx`
Product filtering UI.

---

### Phase 4: Page Refactoring

#### [MODIFY] `pages/Products.jsx`
Refactor to use custom hooks, Shadcn UI components, and Tailwind CSS.

**Before** (763 lines):
- Bootstrap components
- Direct API calls
- Inline form handling
- Custom pagination logic

**After** (~150 lines):
```jsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"

const Products = () => {
  const { items, loading, create, update, remove } = useCRUD('/products');
  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen, open, close } = useModal();
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button onClick={open}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Products" value={items.length} />
        <StatsCard title="In Stock" value={120} variant="success" />
        <StatsCard title="Low Stock" value={5} variant="warning" />
        <StatsCard title="Out of Stock" value={2} variant="danger" />
      </div>

      {/* Search */}
      <SearchBar value={searchTerm} onChange={setSearchTerm} />

      {/* Table */}
      <Card>
        <ProductTable 
          data={items} 
          loading={loading}
          onEdit={handleEdit}
          onDelete={remove}
        />
      </Card>

      {/* Form Dialog */}
      <FormDialog open={isOpen} onOpenChange={close} title="Add Product">
        <ProductForm onSubmit={create} />
      </FormDialog>
    </div>
  );
};
```

#### [MODIFY] Other CRUD Pages
#### [MODIFY] `contexts/AuthContext.jsx`
Add user preferences and settings management.

---

### Phase 6: TypeScript Migration (Optional)

#### [NEW] `types/index.ts`
Type definitions for all entities (Product, Customer, etc.).

#### Gradual Migration
- Start with new components
- Convert hooks to TypeScript
- Migrate existing components incrementally

---

## File Structure (After Refactoring)

```
resources/js/
├── hooks/
│   ├── useCRUD.js
│   ├── useSearch.js
│   ├── useForm.js
│   ├── usePagination.js
│   ├── useModal.js
│   └── useToast.js
├── components/
│   ├── common/
│   │   ├── DataTable.jsx
│   │   ├── Pagination.jsx
│   │   ├── SearchBar.jsx
│   │   ├── FormModal.jsx
│   │   ├── StatsCard.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── PageHeader.jsx
│   ├── products/
│   │   ├── ProductForm.jsx
│   │   ├── ProductTable.jsx
│   │   └── ProductFilters.jsx
│   ├── customers/
│   │   └── ...
│   └── ...
├── contexts/
│   ├── AuthContext.jsx
│   ├── APIContext.jsx
│   ├── ToastContext.jsx
│   └── ...
├── pages/
│   ├── Products.jsx (refactored)
│   ├── Customers.jsx (refactored)
│   └── ...
└── utils/
    ├── validators.js
    ├── formatters.js
    └── constants.js
```

---

## Implementation Strategy

### Step 0: UI Library Setup (Week 1 - Days 1-2)
1. Add Tailwind CSS via CDN to `app.blade.php`
2. Install Shadcn UI dependencies (`npm install`)
3. Setup `lib/utils.js` for cn() function
4. Install core Shadcn components via MCP server:
   - Button, Card, Table, Dialog, Input, Select, Badge, Toast
5. Test Shadcn components in isolation
6. Create Tailwind config with custom theme colors

### Step 1: Create Foundation (Week 1 - Days 3-5)
1. Create `hooks/useCRUD.js`
2. Create `hooks/useSearch.js`
3. Create `hooks/useModal.js`
4. Create `components/common/DataTable.jsx`
5. Create `components/common/Pagination.jsx`

### Step 2: Refactor Pilot Page (Week 1)
1. Choose `Products.jsx` as pilot

## Verification Plan

### Automated Tests
- Unit tests for custom hooks using React Testing Library
- Component tests for reusable components
- Integration tests for refactored pages

### Manual Verification
1. **CRUD Operations**: Verify create, read, update, delete work correctly
2. **Search & Filter**: Test search functionality and filters
3. **Pagination**: Verify pagination works across all pages
4. **Form Validation**: Test all form validations
5. **Error Handling**: Verify error messages display correctly
6. **Performance**: Measure page load times before/after

---

## Expected Outcomes

### Code Metrics
- **Lines of Code**: Reduce by ~40-50%
- **Code Duplication**: Reduce by ~60-70%
- **Component Size**: Average page component <200 lines
- **Reusability**: 80%+ of UI logic in reusable hooks/components

### Developer Experience
- **New Feature Development**: 50% faster
- **Bug Fixes**: 60% faster to locate and fix
- **Onboarding**: New developers productive in 2 days vs 1 week

### Performance
- **Bundle Size**: Reduce by ~15-20% through better code splitting
- **Initial Load**: Improve by ~10-15%
- **Re-render Optimization**: Reduce unnecessary re-renders by 40%
