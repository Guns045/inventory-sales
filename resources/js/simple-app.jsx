import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('Simple app starting...');

// Simple test without complex dependencies
const SimpleApp = () => {
  console.log('SimpleApp rendering...');
  return React.createElement('div', {
    style: {
      padding: '30px',
      backgroundColor: '#28a745',
      color: 'white',
      textAlign: 'center',
      margin: '20px',
      borderRadius: '15px',
      fontFamily: 'Arial, sans-serif'
    }
  }, [
    React.createElement('h1', { key: 'title' }, '🎉 Original React App Structure Working!'),
    React.createElement('p', { key: 'desc' }, 'Imports berjalan dengan baik.'),
    React.createElement('p', { key: 'next' }, 'Sekarang kita akan coba load dependencies...')
  ]);
};

try {
  console.log('Creating root element...');
  const container = document.getElementById('root');
  const root = createRoot(container);

  console.log('Rendering SimpleApp...');
  root.render(React.createElement(SimpleApp));

  console.log('✅ SimpleApp rendered successfully!');
} catch (error) {
  console.error('❌ Error rendering SimpleApp:', error);
  document.getElementById('debug-info').innerHTML =
    '<div style="color: red;">❌ Error: ' + error.message + '</div>';
}