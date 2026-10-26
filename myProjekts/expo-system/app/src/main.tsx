import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Booth } from './booth/Booth.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><Booth /></StrictMode>);
