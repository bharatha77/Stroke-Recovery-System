import React from 'react';

function Header() {
  return (
    <header className="bg-white shadow-sm mb-6 p-4 rounded-lg">
      <h1 className="text-2xl font-semibold text-gray-900">
        Stroke Recovery Dashboard
      </h1>
      <p className="text-sm text-gray-600 mt-1">
        An overview of your recovery progress using various interaction tests.
      </p>
    </header>
  );
}

export default Header;