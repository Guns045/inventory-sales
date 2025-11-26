# Custom Hooks

This directory contains reusable custom React hooks for common operations.

## Available Hooks

### useCRUD
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
  getById,
  setPage,
  refresh
} = useCRUD('/products');
```

### useSearch
Debounced search hook with auto-suggestion support.

```javascript
const { 
  searchTerm, 
  setSearchTerm, 
  suggestions, 
  searching,
  clearSearch
} = useSearch('/products/search', { debounce: 300, minChars: 2 });
```

### useModal
Modal state management hook.

```javascript
const { 
  isOpen, 
  open, 
  close, 
  toggle 
} = useModal();
```

### usePagination
Reusable pagination logic.

```javascript
const { 
  currentPage, 
  totalPages, 
  goToPage, 
  nextPage, 
  prevPage,
  canGoNext,
  canGoPrev
} = usePagination(totalItems, itemsPerPage);
```

### useToast
Toast notification hook.

```javascript
const { 
  showSuccess, 
  showError, 
  showInfo,
  showWarning
} = useToast();
```

### useForm
Enhanced form hook with Zod validation.

```javascript
const { 
  register,
  handleSubmit, 
  errors,
  reset
} = useForm(schema, { defaultValues });
```

## Usage Example

```javascript
import { useCRUD } from '@/hooks/useCRUD';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';

function ProductsPage() {
  const { items, loading, create, remove } = useCRUD('/products');
  const { isOpen, open, close } = useModal();
  const { showSuccess, showError } = useToast();

  const handleCreate = async (data) => {
    const result = await create(data);
    if (result.success) {
      showSuccess('Product created successfully');
      close();
    } else {
      showError(result.error);
    }
  };

  return (
    // Your component JSX
  );
}
```
