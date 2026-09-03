'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Store, MapPin, Users, Percent, Phone, FileText, Save } from 'lucide-react';

export default function RestaurantDashboard() {
  const { restaurant, updateRestaurant } = useAuth();

  const [name, setName] = useState(restaurant?.restaurant_name || '');
  const [gst, setGst] = useState(restaurant?.gst_number || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [addr1, setAddr1] = useState(restaurant?.address_line1 || '');
  const [addr2, setAddr2] = useState(restaurant?.address_line2 || '');
  const [addr3, setAddr3] = useState(restaurant?.address_line3 || '');
  const [owner1, setOwner1] = useState(restaurant?.owner1 || '');
  const [owner2, setOwner2] = useState(restaurant?.owner2 || '');
  const [owner3, setOwner3] = useState(restaurant?.owner3 || '');
  const [owner4, setOwner4] = useState(restaurant?.owner4 || '');
  const [taxRate, setTaxRate] = useState(String(restaurant?.tax_rate || 18));
  const [saving, setSaving] = useState(false);

  if (!restaurant) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name,
        gst_number: gst || null,
        phone: phone || null,
        address_line1: addr1 || null,
        address_line2: addr2 || null,
        address_line3: addr3 || null,
        owner1: owner1 || null,
        owner2: owner2 || null,
        owner3: owner3 || null,
        owner4: owner4 || null,
        tax_rate: parseFloat(taxRate) || 18,
      };

      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', restaurant.restaurant_id);

      if (error) throw error;

      updateRestaurant({
        restaurant_name: name,
        gst_number: gst || null,
        phone: phone || null,
        address_line1: addr1 || null,
        address_line2: addr2 || null,
        address_line3: addr3 || null,
        owner1: owner1 || null,
        owner2: owner2 || null,
        owner3: owner3 || null,
        owner4: owner4 || null,
        tax_rate: parseFloat(taxRate) || 18,
      } as any);

      setTaxRate(taxRate);
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const sectionClass = 'bg-white rounded-lg shadow-sm border border-gray-200 p-5';
  const sectionTitleClass =
    'text-sm font-semibold text-gray-900 mb-4 flex items-center pb-2 border-b border-gray-100';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Restaurant ID: {restaurant.restaurant_id}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center font-medium text-sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Restaurant Info */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <Store className="h-4 w-4 mr-2 text-blue-600" />
          Restaurant Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Restaurant Name</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>GST Number</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tax Rate (%)</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <MapPin className="h-4 w-4 mr-2 text-blue-600" />
          Address
        </h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Address Line 1</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={addr1}
                onChange={(e) => setAddr1(e.target.value)}
                placeholder="Shop / Building number, Street"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address Line 2</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={addr2}
                onChange={(e) => setAddr2(e.target.value)}
                placeholder="Area / Locality"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address Line 3</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={addr3}
                onChange={(e) => setAddr3(e.target.value)}
                placeholder="City, State, PIN"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Owner Info */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <Users className="h-4 w-4 mr-2 text-blue-600" />
          Owner Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Owner 1</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={owner1}
                onChange={(e) => setOwner1(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Owner 2</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={owner2}
                onChange={(e) => setOwner2(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Owner 3</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={owner3}
                onChange={(e) => setOwner3(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Owner 4</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={owner4}
                onChange={(e) => setOwner4(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
