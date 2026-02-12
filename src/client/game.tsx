import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './pages/home-page';
import { CreateAlbumPage } from './pages/create-album-page';

type Route = 'home' | 'create-album';

export const App = () => {
  const [route, setRoute] = useState<Route>('home');

  if (route === 'create-album') {
    return <CreateAlbumPage onBack={() => setRoute('home')} />;
  }

  return <HomePage onCreateAlbum={() => setRoute('create-album')} />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
