import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const themes = {
  rose: {
    name: 'Gül Kurusu',
    primary: 'bg-rose-500',
    secondary: 'bg-rose-100',
    text: 'text-rose-900',
    accent: 'text-rose-600',
    button: 'bg-rose-500 hover:bg-rose-600 text-white',
    background: 'bg-rose-50',
    border: 'border-rose-200'
  },
  emerald: {
    name: 'Zümrüt Yeşili',
    primary: 'bg-emerald-600',
    secondary: 'bg-emerald-100',
    text: 'text-emerald-900',
    accent: 'text-emerald-700',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    background: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  sky: {
    name: 'Gök Mavisi',
    primary: 'bg-sky-500',
    secondary: 'bg-sky-100',
    text: 'text-sky-900',
    accent: 'text-sky-600',
    button: 'bg-sky-500 hover:bg-sky-600 text-white',
    background: 'bg-sky-50',
    border: 'border-sky-200'
  },
  amber: {
    name: 'Gün Batımı',
    primary: 'bg-amber-500',
    secondary: 'bg-amber-100',
    text: 'text-amber-900',
    accent: 'text-amber-600',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    background: 'bg-amber-50',
    border: 'border-amber-200'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('emerald');

  useEffect(() => {
    const storedTheme = localStorage.getItem('namaz_theme');
    if (storedTheme && themes[storedTheme]) {
      setCurrentTheme(storedTheme);
    }
  }, []);

  const changeTheme = (themeKey) => {
    setCurrentTheme(themeKey);
    localStorage.setItem('namaz_theme', themeKey);
  };

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
