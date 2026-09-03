'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface MPINAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
  expectedMpin: string;
}

export default function MPINAuth({
  onSuccess,
  onCancel,
  expectedMpin,
}: MPINAuthProps) {
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mpin === expectedMpin) {
      setMpin('');
      onSuccess();
    } else {
      setError('Incorrect MPIN. Please try again.');
      setMpin('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setMpin(val);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Lock className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Enter MPIN</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="text-sm text-gray-600 mb-4">
            Enter your 4-digit MPIN to access restaurant mode.
          </p>
          <input
            type="password"
            value={mpin}
            onChange={handleChange}
            placeholder="••••"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            autoFocus
            maxLength={4}
          />
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Default MPIN: 1234
          </p>
          <button
            type="submit"
            disabled={mpin.length !== 4}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
