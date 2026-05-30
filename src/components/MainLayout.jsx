import { useState } from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex">
            <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
            <main className={`flex-1 transition-all duration-300 pt-16 lg:pt-0 ${isCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[280px]'}`}>
                <div className="max-w-7xl mx-auto p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
