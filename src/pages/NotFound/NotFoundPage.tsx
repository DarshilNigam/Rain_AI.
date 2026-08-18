import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import styles from './NotFoundPage.module.css';

export const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.root}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Location / Route Not Found</h1>
      <p className={styles.desc}>
        The requested R.A.I. intelligence module or geographic view is not registered in the system index.
      </p>
      <Link to="/">
        <Button variant="primary" leadingIcon={<Home size={16} />}>
          Return to Overview
        </Button>
      </Link>
    </div>
  );
};
