import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <>
      <Dashboard />
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        theme="dark"
        toastStyle={{ background: '#11111e', border: '1px solid #1e1e32', color: '#e2e8f0' }}
      />
    </>
  );
}
