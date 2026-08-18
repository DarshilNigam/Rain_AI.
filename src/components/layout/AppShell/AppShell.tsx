import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { Footer } from '../Footer';
import styles from './AppShell.module.css';

export const AppShell: React.FC = () => {
  return (
    <div className={styles.shell}>
      <Header />
      <main id="main-content" className={styles.mainContent}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
