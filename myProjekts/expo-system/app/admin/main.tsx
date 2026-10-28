// The admin platform's own page: a separate address from the booth (vite.admin.config.ts builds it into dist-admin).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from '../src/admin/AdminApp.tsx';
import '../src/styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><AdminApp /></StrictMode>);
