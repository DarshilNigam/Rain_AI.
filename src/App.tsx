import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ScrollToTop } from './components/layout';
import { CinematicIntro } from './components/ui';
import { AuthProvider, LocationProvider, FarmerProvider } from './context';
import { I18nProvider } from './i18n';
import './styles/global.css';

export const App: React.FC = () => {
  const [introCompleted, setIntroCompleted] = useState<boolean>(false);

  return (
    <I18nProvider>
      <AuthProvider>
        <LocationProvider>
          <FarmerProvider>
            <BrowserRouter>
              {!introCompleted && <CinematicIntro onComplete={() => setIntroCompleted(true)} />}
              <ScrollToTop />
              <AppRoutes />
            </BrowserRouter>
          </FarmerProvider>
        </LocationProvider>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;
