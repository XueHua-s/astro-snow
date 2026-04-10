import { useCallback, useRef, useState } from 'react';
import { useLocalStorage } from '@reactuses/core';

export default function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [, setThemeStorage] = useLocalStorage<'dark' | 'light'>(
    'theme',
    'light',
  );
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const applyTheme = useCallback(
    (isDark: boolean) => {
      const rootElement = document.documentElement;
      if (isDark) {
        rootElement.classList.add('dark');
        rootElement.classList.remove('light');
        rootElement.dataset.theme = 'dark';
        setThemeStorage('dark');
      } else {
        rootElement.classList.remove('dark');
        rootElement.classList.add('light');
        rootElement.dataset.theme = 'light';
        setThemeStorage('light');
      }
    },
    [setThemeStorage],
  );

  const toggleTheme = useCallback(() => {
    const rootElement = document.documentElement;
    const willBeDark = !rootElement.classList.contains('dark');
    const toggleElement = buttonRef.current;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (toggleElement) {
      const rect = toggleElement.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    rootElement.classList.add('theme-transition');

    const startViewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void) => {
          ready: Promise<void>;
          finished: Promise<void>;
        };
      }
    ).startViewTransition;

    if (!startViewTransition) {
      applyTheme(willBeDark);
      setIsDarkMode(willBeDark);
      setTimeout(() => {
        rootElement.classList.remove('theme-transition');
      }, 100);
      return;
    }

    let transition:
      | { ready: Promise<void>; finished: Promise<void> }
      | undefined;
    try {
      transition = startViewTransition.call(document, () => {
        applyTheme(willBeDark);
        setIsDarkMode(willBeDark);
      });
    } catch (error) {
      console.error('Theme transition error:', error);
      applyTheme(willBeDark);
      setIsDarkMode(willBeDark);
      rootElement.classList.remove('theme-transition');
      return;
    }

    transition.ready
      .then(() => {
        rootElement.style.setProperty('--x', `${x}px`);
        rootElement.style.setProperty('--y', `${y}px`);
      })
      .catch((error) => {
        console.error('Theme transition setup error:', error);
      });

    transition.finished
      .then(() => {
        rootElement.classList.remove('theme-transition');
      })
      .catch(() => {
        rootElement.classList.remove('theme-transition');
      });
  }, [applyTheme]);

  return (
    <>
      <button
        className="theme-toggle text-2xl cursor-pointer bg-transparent border-0 p-0 transition-transform duration-300 hover:scale-110"
        id="theme-toggle-btn"
        type="button"
        aria-label="toggle theme"
        aria-pressed={isDarkMode}
        onClick={toggleTheme}
        suppressHydrationWarning
        ref={buttonRef}>
        <i
          className="fa-solid fa-sun text-2xl theme-icon-light transition-all duration-300"
          suppressHydrationWarning></i>
        <i
          className="fa-solid fa-moon text-2xl theme-icon-dark transition-all duration-300"
          suppressHydrationWarning></i>
      </button>
      <style>{`
        .theme-toggle {
          position: relative;
          z-index: 10;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-toggle i {
          position: absolute;
          text-shadow: none;
          filter: none;
        }

        /* Light mode: show sun, hide moon */
        .theme-icon-light {
          opacity: 1;
          transform: rotate(0deg) scale(1);
        }
        .theme-icon-dark {
          opacity: 0;
          transform: rotate(-180deg) scale(0);
        }

        /* Dark mode: hide sun, show moon */
        html.dark .theme-icon-light {
          opacity: 0;
          transform: rotate(180deg) scale(0);
        }
        html.dark .theme-icon-dark {
          opacity: 1;
          transform: rotate(0deg) scale(1);
        }

        /* Disable icon CSS transition during view transition to avoid conflict */
        html.theme-transition .theme-icon-light,
        html.theme-transition .theme-icon-dark {
          transition: none !important;
        }
      `}</style>
    </>
  );
}
