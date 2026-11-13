import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installApiHeaders} from './utils/deviceKey.ts';

installApiHeaders();

createRoot(document.getElementById('root')!).render(<App />);
