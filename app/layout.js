'use client';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './globals.css';
import menuData from './menu';
import { SnackbarProvider } from '@components/SnackbarContext';
import { DialogsProvider } from '@toolpad/core/useDialogs';
import { ThemeProvider } from '@mui/material/styles';
import theme from './muiTheme';
import { usePathname } from 'next/navigation';
import { cx } from 'class-variance-authority';
import packageJson from '../package.json' with { type: 'json' };

// AG Grid settings
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CustomFilterModule,
  RowSelectionModule,
  TextEditorModule,
  ScrollApiModule,
  RowApiModule,
  ClientSideRowModelApiModule,
  RowAutoHeightModule,
  LargeTextEditorModule,
  SelectEditorModule,
  NumberEditorModule,
  RowDragModule,
  CellStyleModule,
} from 'ag-grid-community';
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CustomFilterModule,
  RowSelectionModule,
  TextEditorModule,
  ScrollApiModule,
  RowApiModule,
  ClientSideRowModelApiModule,
  RowAutoHeightModule,
  LargeTextEditorModule,
  SelectEditorModule,
  NumberEditorModule,
  RowDragModule,
  CellStyleModule,
]);
const AG_GRID_SPACING = '4.1px';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const renderMenu = (menuItems, isSidebarOpen, level = 0) => {
  const indentClass = isSidebarOpen ? (!!level ? 'ml-3' : '-ml-1') : '';
  return (
    <ul>
      {menuItems.map((item, index) => (
        <li key={index} className={indentClass}>
          {item.route ? (
            <Link
              href={item.route}
              className={cx(
                !isSidebarOpen && 'flex items-center justify-center h-6',
                'hover:bg-gray-700 p-1 rounded-md'
              )}
              title={isSidebarOpen ? '' : item.label}
            >
              {isSidebarOpen ? item.label : item.collapseIcon}
            </Link>
          ) : (
            <span
              className={cx(!isSidebarOpen && 'flex items-center justify-center h-6', 'p-1 opacity-50')}
              title={isSidebarOpen ? '' : item.label}
            >
              {isSidebarOpen ? item.label : item.collapseIcon}
            </span>
          )}
          {item.children && renderMenu(item.children, isSidebarOpen, level + 1)}
        </li>
      ))}
    </ul>
  );
};

export default function RootLayout({ children }) {
  // Sidebar state and events
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const pathname = usePathname();
  const isSidebarHidden = pathname.includes('/viz-host/');

  /**
   * Adjusts AG Grid row padding settings.
   */
  useEffect(() => {
    document.documentElement.style.setProperty('--ag-spacing', AG_GRID_SPACING);
  }, []);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider>
            <div
              className={cx(
                !isSidebarHidden && 'grid',
                isSidebarOpen ? 'grid-cols-[250px_1fr]' : 'grid-cols-[50px_1fr]'
              )}
            >
              {!isSidebarHidden && (
                <aside
                  className={cx(
                    'bg-gray-800 text-white h-full flex flex-col transition-all duration-300 w-full py-4',
                    isSidebarOpen ? 'px-4' : 'px-2'
                  )}
                >
                  <div className="flex-shrink-0">
                    <button
                      onClick={toggleSidebar}
                      className="mb-4 bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 transition-colors"
                    >
                      {isSidebarOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
                    </button>
                  </div>
                  <nav className="flex-grow">{renderMenu(menuData, isSidebarOpen)}</nav>
                  <footer className="mt-auto text-center text-gray-400 text-sm">
                    {isSidebarOpen ? (
                      <>
                        Diff2Rule v{packageJson.xversion}
                        <br />
                        Anna Volodina, 2024
                      </>
                    ) : (
                      <>D2R<br/>{packageJson.xversion}</>
                    )}
                  </footer>
                </aside>
              )}
              <DialogsProvider>
                <main className="p-4 overflow-y-auto h-screen">{children}</main>
              </DialogsProvider>
            </div>
          </SnackbarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
