import { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
import ToastContainer from './components/ui/Toast';
import SignUp from './pages/SignUp';
import VerifyEmail from './pages/VerifyEmail';
import Onboarding from './pages/Onboarding';
import MainChat from './pages/MainChat';
import Search from './pages/Search';
import Settings from './pages/Settings';

type Route =
  | '/auth/signup'
  | '/auth/verify-email'
  | '/onboarding/profile'
  | '/'
  | '/search'
  | '/settings';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('/auth/signup');
  const [routeData, setRouteData] = useState<{ email?: string }>({});

  const navigate = (path: Route, data?: { email?: string }) => {
    setCurrentRoute(path);
    if (data) setRouteData(data);
  };

  return (
    <AppProvider>
      <ToastContainer />
      {currentRoute === '/auth/signup' && <SignUp onNavigate={navigate} />}
      {currentRoute === '/auth/verify-email' && (
        <VerifyEmail email={routeData.email || ''} onNavigate={navigate} />
      )}
      {currentRoute === '/onboarding/profile' && <Onboarding onNavigate={navigate} />}
      {currentRoute === '/' && <MainChat onNavigate={navigate} />}
      {currentRoute === '/search' && <Search onNavigate={navigate} />}
      {currentRoute === '/settings' && <Settings onNavigate={navigate} />}
    </AppProvider>
  );
}

export default App;
