import useUser from '../hooks/authentication/useUser';
import { useLocalStorageState } from '../hooks/other/useLocalStorage';
import DarkModeContext from './DarkModeContext';
import { FC, PropsWithChildren, useEffect } from 'react';

const DarkModeProvider: FC<PropsWithChildren> = ({ children }) => {
  const { data } = useUser();

  const [isDarkMode, setIsDarkMode] = useLocalStorageState(false, 'isDarkMode');

  useEffect(() => {
    const isUserDarkMode = data?.data?.settings?.theme === 'dark';

    if (data && isUserDarkMode !== undefined) {
      setIsDarkMode(isUserDarkMode);
    }
  }, [data, setIsDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const handleLogoutDark = () => {
    setIsDarkMode(false);
  };

  return (
    <DarkModeContext.Provider
      value={{ isDarkMode, toggleDarkMode, handleLogoutDark }}
    >
      {children}
    </DarkModeContext.Provider>
  );
};

export default DarkModeProvider;