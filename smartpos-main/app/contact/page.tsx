'use client';

import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">SmartPOS</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>

        <p className="text-gray-600 leading-relaxed mb-6">
          This website is operated by <strong>GAJANAN DATTATRAYA JOSHI</strong>, an individual merchant.
        </p>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-700">Details</th>
                <th className="text-left px-5 py-3 font-medium text-gray-700">Information</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3 text-gray-500">Legal Name</td>
                <td className="px-5 py-3 text-gray-900 font-medium">GAJANAN DATTATRAYA JOSHI</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-gray-500">Address</td>
                <td className="px-5 py-3 text-gray-900 font-medium">
                  HILL GARDEN ROW HOUSE - 4, TIKUJINIWADI ROAD, OPPOSITE TIKUJINIWADI,
                  CHITALSAR MANPADA, THANE WEST, THANE, APNA BAZAR, THANE,
                  MAHARASHTRA - 400610
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-gray-500">Mobile</td>
                <td className="px-5 py-3 text-gray-900 font-medium">+91-9820504215</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-gray-500">Email</td>
                <td className="px-5 py-3 text-gray-900 font-medium">JOSHI_GD@YAHOO.COM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer className="bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 mb-3">
            &copy; 2026 SmartPOS &bull; Operated by GAJANAN DATTATRAYA JOSHI
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <Link href="/about" className="hover:text-gray-300 transition-colors">About</Link>
            <span>&bull;</span>
            <Link href="/contact" className="hover:text-gray-300 transition-colors">Contact</Link>
            <span>&bull;</span>
            <Link href="/products-and-services" className="hover:text-gray-300 transition-colors">Products and Services</Link>
            <span>&bull;</span>
            <Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <span>&bull;</span>
            <Link href="/return-refund-policy" className="hover:text-gray-300 transition-colors">Refund</Link>
            <span>&bull;</span>
            <Link href="/cancellation-policy" className="hover:text-gray-300 transition-colors">Cancellation</Link>
            <span>&bull;</span>
            <Link href="/shipping-policy" className="hover:text-gray-300 transition-colors">Shipping</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
