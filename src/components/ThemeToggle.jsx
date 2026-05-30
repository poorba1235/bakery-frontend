import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-[100] p-3 rounded-full bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] shadow-lg text-slate-800 dark:text-white hover:scale-105 transition-transform"
            title="Toggle theme"
        >
            {isDark ? (
                <Sun className="w-6 h-6 text-yellow-500" />
            ) : (
                <Moon className="w-6 h-6 text-blue-600" />
            )}
        </button>
    );
}
