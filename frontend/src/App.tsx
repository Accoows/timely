import { useState } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/Home/HomePage';
import BookingsPage from './pages/Bookings/BookingsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'home' ? (
        <HomePage />
      ) : (
        <BookingsPage />
      )}
    </Layout>
  );
}
