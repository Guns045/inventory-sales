# Shadcn UI Components

This directory contains Shadcn UI components for the application.

## Available Components

- **Button** (`button.jsx`) - Versatile button component with multiple variants
- **Card** (`card.jsx`) - Card container with header, content, and footer
- **Input** (`input.jsx`) - Form input component
- **Dialog** (`dialog.jsx`) - Modal dialog component
- **Badge** (`badge.jsx`) - Badge/tag component with color variants
- **Table** (`table.jsx`) - Table component with header, body, and footer
- **Select** (`select.jsx`) - Dropdown select component

## Usage Example

```jsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## Styling

All components use Tailwind CSS for styling and support the `className` prop for custom styling.

## Dependencies

- `@radix-ui/*` - Headless UI primitives
- `class-variance-authority` - For variant management
- `clsx` & `tailwind-merge` - For className merging
- `lucide-react` - Icon library
