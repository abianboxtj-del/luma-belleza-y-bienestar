# AI Development Rules - Lumá

## Tech Stack
- **React 19 & TypeScript**: Core framework for building the user interface with type safety.
- **Vite**: Build tool and development server for fast HMR and optimized builds.
- **Tailwind CSS 4**: Utility-first CSS framework for all styling needs.
- **Firebase (Firestore & Auth)**: Backend-as-a-Service for data persistence and user authentication.
- **React Router 7**: Handles client-side navigation and protected administrative routes.
- **Motion**: Used for smooth UI animations, transitions, and scroll-reveal effects.
- **Lucide React**: The primary icon library for consistent and scalable vector icons.
- **shadcn/ui (Base UI)**: Accessible, unstyled primitives used for complex UI components like Dialogs, Selects, and Calendars.
- **React Hot Toast**: Lightweight library for providing immediate user feedback via notifications.
- **date-fns**: Utility library for all date formatting, parsing, and manipulation.

## Library Usage Rules

### 1. Styling & Layout
- **Tailwind CSS**: Always use Tailwind utility classes for styling. Avoid writing custom CSS in `.css` files unless defining theme variables or complex animations.
- **Conditional Classes**: Use the `cn(...)` utility located in `src/lib/utils.ts` to merge Tailwind classes and handle conditional logic.

### 2. Icons & Media
- **Icons**: Use `lucide-react` exclusively. Do not install or use other icon sets.
- **Images**: Use high-quality Unsplash URLs for placeholders or the provided Firebase Storage URLs for brand assets (like the logo).

### 3. Data & Backend
- **Firebase Utils**: Use the abstraction layer in `src/lib/firebase-utils.ts` for Firestore operations (`getCollection`, `subscribeToCollection`, `addDocument`, etc.) to ensure consistent error handling.
- **Authentication**: Use the `useAuth` hook from `src/contexts/AuthContext.tsx` to access user state and admin permissions.

### 4. UI Components
- **shadcn/ui**: Before building a new complex component (like a modal or dropdown), check `src/components/ui/`. These components are built on Base UI and should be the foundation for the design system.
- **Forms**: Use standard HTML inputs wrapped in shadcn/ui components (`Input`, `Select`, `Textarea`) for consistent styling.

### 5. Animations
- **Motion**: Use the `motion` component for any entrance animations, hover effects, or layout transitions. Keep animations subtle and professional (e.g., `initial={{ opacity: 0, y: 20 }}`).

### 6. Dates & Time
- **date-fns**: Use `date-fns` for all date logic. For localization (Spanish), always import the `es` locale: `import { es } from 'date-fns/locale'`.

### 7. User Feedback
- **Toasts**: Use `toast.success()` or `toast.error()` from `react-hot-toast` for all asynchronous operations (booking a turn, saving a service, etc.).