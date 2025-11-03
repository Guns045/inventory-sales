# Frontend Guideline Document

This document provides a clear overview of how the frontend of the **inventory-sales** application is structured, styled, and maintained. It is written in everyday language so that anyone—technical or not—can understand how the user interface is built and managed.

## 1. Frontend Architecture

**Frameworks & Libraries**
- **React 18**: The core library for building our user interface in a component-based way.
- **Vite**: A fast build tool and development server for bundling and hot-reloading.
- **React Bootstrap 5**: Provides a collection of polished, accessible UI components (buttons, forms, modals, etc.).
- **Tailwind CSS**: A utility-first CSS framework for flexible, custom styling with minimal overhead.
- **React Router Dom (v6)**: Manages navigation and URL routing in a single-page app.
- **Axios**: Handles HTTP requests to our Laravel backend API.

**How It Supports Our Goals**
- **Scalability**: Components are self-contained and reusable, so adding new features doesn’t bloat existing code.
- **Maintainability**: Clear folder structure (`components/`, `pages/`, `contexts/`) keeps code organized. Context providers centralize shared state and API logic.
- **Performance**: Vite’s fast bundling and Tailwind’s purgeCss remove unused styles. Lazy-loading of components and code-splitting (see Section 7) speed up initial load times.

## 2. Design Principles

1. **Usability**: Every feature should be obvious and simple to use. Forms guide users with clear labels, placeholders, and inline validation messages.
2. **Accessibility**: We follow WCAG guidelines—semantic HTML, ARIA attributes on custom components, keyboard navigation, and proper color contrast.
3. **Responsiveness**: Mobile-first design ensures the app works on all screen sizes. React Bootstrap’s grid plus Tailwind’s responsive utilities adapt layouts fluidly.
4. **Consistency**: Design tokens (colors, spacing, typography) are defined once and reused throughout the UI to give a coherent look and feel.

## 3. Styling and Theming

### Approach
- **Utility-First with Tailwind**: Most custom styling uses Tailwind’s utility classes (e.g., `p-4`, `bg‐primary`).
- **React Bootstrap Theming**: We override Bootstrap’s Sass variables via a custom SCSS entry if deeper component customization is needed.
- **Minimal Custom CSS**: Any additional styles go into scoped CSS modules or small global files (`index.css`, `App.css`).

### Theme Style
- **Visual Style**: Modern, flat design with subtle shadows and rounded corners for a clean, professional look.
- **Glassmorphism Elements**: Used sparingly (e.g., header or modal backgrounds) to give depth without sacrificing readability.

### Color Palette (CSS Variables)
```css
:root {
  --color-primary:   #0d6efd;
  --color-secondary: #6c757d;
  --color-success:   #198754;
  --color-danger:    #dc3545;
  --color-warning:   #ffc107;
  --color-info:      #0dcaf0;
  --color-light:     #f8f9fa;
  --color-dark:      #212529;
  --color-bg:        #ffffff;
  --color-text:      #212529;
}
```

### Typography
- **Primary Font**: `Inter, sans-serif` for modern readability.
- **Secondary Font**: `Roboto, sans-serif` for headings and emphasis.

## 4. Component Structure

**Folder Organization**
- **`components/`**: Reusable UI pieces (buttons, form fields, dropdowns).
- **`pages/`**: Screen-level components (Login, Dashboard, Products, Quotations).
- **`contexts/`**: React Context providers for shared state and logic.

**Naming & Best Practices**
- **PascalCase** for component filenames (e.g., `ProductCard.jsx`).
- **Index Exports**: Each folder can have an `index.js` exporting its components for cleaner imports.
- **Single Responsibility**: Each component does one thing—either a UI element or a container that wires logic and passes props down.

**Benefits**
- **Reusability**: Build once, use everywhere—reduces duplication.
- **Testability**: Small, focused components are easier to test and debug.

## 5. State Management

We rely on **React Context API** and custom hooks for global state:
- **AuthContext**: Holds user token and profile.
- **APIContext**: Provides a pre-configured Axios instance with authentication headers.
- **PermissionContext**: Stores user roles and permissions for UI gating.
- **NotificationContext**: Manages global alerts and toast messages.
- **CompanyContext**: Stores company-specific settings (e.g., currency, tax rate).

**Guidelines**
- Keep context values minimal and only share what truly needs to be global.
- Use custom hooks (e.g., `useAuth()`, `useApi()`) to encapsulate context consumption.
- Local component state (`useState`) is preferred for UI-only concerns.

## 6. Routing and Navigation

- **Library**: React Router Dom v6
- **Route Definitions**: In `App.js`, wrap routes with `<Routes>` and `<Route>`.
- **Protected Routes**:
  - **`<ProtectedRoute>`** checks if the user is logged in; if not, redirects to Login.
  - **`<RoleBasedRoute>`** ensures the user has the right role/permission before showing a page.
- **Layout Component**: A single `<Layout>` component contains sidebar navigation and header; all page components render in its `<Outlet>`.

## 7. Performance Optimization

1. **Code Splitting**:
   - Use `React.lazy()` and `<Suspense>` to load large pages only when needed.
2. **Tree Shaking & PurgeCSS**:
   - Tailwind’s purge step removes unused styles in production.
3. **Asset Optimization**:
   - Compress images and SVGs.
   - Serve modern image formats (WebP) where possible.
4. **Memoization**:
   - Use `React.memo`, `useMemo`, and `useCallback` to prevent unnecessary re-renders.
5. **Lazy Loading Data**:
   - Fetch data when a component mounts, not all at once on page load.
6. **Vite Optimizations**:
   - Takes advantage of ES modules for faster HMR in development and efficient code splitting in production bundles.

## 8. Testing and Quality Assurance

**Unit & Integration Testing**
- **Jest**: JavaScript test runner.
- **React Testing Library**: For testing component output and user interactions.

**End-to-End Testing**
- **Cypress** (recommended): Automate user flows like login, navigation, and form submissions.

**Linting & Formatting**
- **ESLint**: Enforce code style, catch common errors.
- **Prettier**: Auto-format code for consistency.

**Continuous Integration**
- Run tests and linting on every pull request to catch regressions early.

## 9. Conclusion and Overall Frontend Summary

This guideline outlines a clean, scalable, and maintainable frontend for the **inventory-sales** system. By leveraging React 18, Vite, React Bootstrap, and Tailwind CSS, we achieve a balance of rapid development and polished design. Our component structure and Context-based state management keep complexity in check, while performance optimizations and thorough testing ensure a fast, reliable user experience. Adhering to these principles will help any team member—new or experienced—understand, maintain, and extend the frontend with confidence.