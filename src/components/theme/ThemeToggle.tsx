import { useCallback, useRef } from 'react';
import { useIsDarkTheme } from '@hooks/useIsDarkTheme';

function setTheme(isDark: boolean) {
  document.dispatchEvent(
    new CustomEvent('site:theme-change', { detail: isDark ? 'dark' : 'light' }),
  );
}

export default function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isDarkMode = useIsDarkTheme();

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
      setTheme(willBeDark);
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
        setTheme(willBeDark);
      });
    } catch (error) {
      console.error('Theme transition error:', error);
      setTheme(willBeDark);
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
  }, []);

  return (
    <>
      <button
        className="theme-toggle header-icon-button border-0 p-0"
        id="theme-toggle-btn"
        type="button"
        aria-label="toggle theme"
        aria-pressed={isDarkMode}
        onClick={toggleTheme}
        suppressHydrationWarning
        ref={buttonRef}>
        <i
          className="fa-solid fa-sun text-xl theme-icon-light transition-all duration-300"
          suppressHydrationWarning></i>
        <i
          className="fa-solid fa-moon text-xl theme-icon-dark transition-all duration-300"
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
          transform: scale(0.9);
        }

        /* Dark mode: hide sun, show moon */
        html.dark .theme-icon-light {
          opacity: 0;
          transform: scale(0.9);
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
