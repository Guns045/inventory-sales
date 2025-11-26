# Common Components

This directory contains reusable UI components built with Shadcn UI.

## Available Components

### DataTable
Generic data table with sorting, filtering, and actions.

```jsx
<DataTable
  columns={[
    { header: "Name", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row) => <Badge>{row.status}</Badge>
    }
  ]}
  data={users}
  loading={loading}
  actions={(row) => (
    <>
      <Button size="sm" onClick={() => handleEdit(row)}>Edit</Button>
      <Button size="sm" variant="destructive" onClick={() => handleDelete(row)}>Delete</Button>
    </>
  )}
/>
```

### SearchBar
Search input with debouncing and suggestions.

```jsx
<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search products..."
  suggestions={suggestions}
  onSelectSuggestion={handleSelect}
  searching={loading}
/>
```

### FormDialog
Dialog for create/edit forms.

```jsx
<FormDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Add Product"
  description="Fill in the product details"
  onSubmit={handleSubmit}
  loading={submitting}
>
  <Input placeholder="Product name" />
  <Input placeholder="Price" type="number" />
</FormDialog>
```

### StatsCard
Statistics card with icon and trend.

```jsx
<StatsCard
  title="Total Sales"
  value="$12,345"
  icon={<DollarSign className="h-4 w-4" />}
  trend="+12.5%"
  variant="success"
/>
```

### PageHeader
Page title with action buttons.

```jsx
<PageHeader
  title="Products"
  description="Manage your product inventory"
  onAdd={handleAdd}
  addButtonText="Add Product"
/>
```

### Pagination
Pagination controls with info.

```jsx
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  from={from}
  to={to}
  total={total}
/>
```

### ConfirmDialog
Confirmation dialog for destructive actions.

```jsx
<ConfirmDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  onConfirm={handleDelete}
  title="Delete Product"
  message="Are you sure you want to delete this product? This action cannot be undone."
  variant="destructive"
/>
```

## Usage Example

```jsx
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { PageHeader } from '@/components/common/PageHeader';
import { useCRUD } from '@/hooks/useCRUD';
import { useSearch } from '@/hooks/useSearch';

function ProductsPage() {
  const { items, loading, remove } = useCRUD('/products');
  const { searchTerm, setSearchTerm } = useSearch();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Products" 
        onAdd={handleAdd}
      />
      <SearchBar 
        value={searchTerm} 
        onChange={setSearchTerm} 
      />
      <DataTable 
        columns={columns}
        data={items}
        loading={loading}
        actions={(row) => (
          <Button onClick={() => remove(row.id)}>Delete</Button>
        )}
      />
    </div>
  );
}
```
