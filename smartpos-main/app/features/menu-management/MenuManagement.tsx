"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Database } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  DollarSign,
  Tag,
  X,
  Clock,
} from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type Restaurant = Database["public"]["Tables"]["parameters"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

interface MenuManagementProps {
  restaurant: Restaurant;
}

interface MenuItemForm {
  name: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  available: boolean;
  preparation_time: string;
  options: string;
}

const DEFAULT_PREDEFINED_CATEGORIES = [
  "Appetizers", "Main Course", "Burgers", "Pizza", "Sandwiches",
  "Salads", "Soups", "Desserts", "Beverages", "Hot Drinks", "Cold Drinks",
  "Snacks", "Breakfast", "Lunch", "Dinner", "Vegetarian",
  "Non-Vegetarian", "Vegan", "Seafood", "Chinese", "Indian",
  "Italian", "Mexican", "Continental",
];

export default function MenuManagement({ restaurant }: MenuManagementProps) {
  const { updateRestaurant } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryValue, setCustomCategoryValue] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [itemOptionsInput, setItemOptionsInput] = useState(
    (restaurant.item_options || []).join(", ")
  );
  const [savingItemOptions, setSavingItemOptions] = useState(false);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<MenuItemForm>({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
    available: true,
    preparation_time: "",
    options: "",
  });

  const [imageUrl, setImageUrl] = useState<string>("");

  const predefinedCategories = useMemo(
    () => categories.filter((c) => c.type === "predefined").map((c) => c.name),
    [categories],
  );
  const customCategories = useMemo(
    () => categories.filter((c) => c.type === "custom").map((c) => c.name),
    [categories],
  );
  const allCategoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const fetchCategories = useCallback(async () => {
    if (!restaurant?.restaurant_id) return;
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.restaurant_id)
      .order("name", { ascending: true });
    if (error) {
      toast.error(`Failed to fetch categories: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      const inserts = DEFAULT_PREDEFINED_CATEGORIES.map((name) => ({
        restaurant_id: restaurant.restaurant_id,
        name,
        type: "predefined",
      }));
      const { data: inserted, error: insErr } = await supabase
        .from("categories")
        .insert(inserts)
        .select("*");
      if (insErr) {
        toast.error(`Failed to seed categories: ${insErr.message}`);
        return;
      }
      setCategories(inserted || []);
    } else {
      setCategories(data);
    }
  }, [restaurant?.restaurant_id]);

  const fetchMenuItems = useCallback(async () => {
    if (!restaurant?.restaurant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .eq("restaurant_id", restaurant.restaurant_id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch menu items: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.restaurant_id]);

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, [fetchMenuItems, fetchCategories]);

  const handleImageChange = (url: string) => {
    setImageUrl(url);
    setFormData({ ...formData, image_url: url });
  };

  const handleImageRemove = () => {
    setImageUrl("");
    setFormData({ ...formData, image_url: "" });
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    const trimmedName = newCategoryName.trim();
    if (allCategoryNames.some((cat) => cat.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({
        restaurant_id: restaurant.restaurant_id,
        name: trimmedName,
        type: "custom",
      })
      .select("*")
      .single();
    if (error) {
      toast.error(`Failed to add category: ${error.message}`);
      return;
    }
    setCategories([...categories, data]);
    setNewCategoryName("");
    setShowAddCategory(false);
    toast.success("Category added successfully");
  };

  const handleRemoveCustomCategory = (categoryToRemove: string) => {
    setCategoryToDelete(categoryToRemove);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("restaurant_id", restaurant.restaurant_id)
        .eq("name", categoryToDelete);
      if (error) throw error;
      setCategories(categories.filter((c) => c.name !== categoryToDelete));
      toast.success("Category removed successfully");
    } catch (error: any) {
      toast.error(`Failed to remove category: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setCategoryToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setCategoryToDelete(null);
    setIsDeleting(false);
  };

  const handleSaveItemOptions = async () => {
    if (!restaurant?.restaurant_id) return;
    const options = itemOptionsInput
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    setSavingItemOptions(true);
    try {
      const { error } = await supabase
        .from("parameters")
        .update({ item_options: options })
        .eq("restaurant_id", restaurant.restaurant_id);
      if (error) throw error;
      updateRestaurant({ item_options: options });
      setItemOptionsInput(options.join(", "));
      toast.success("Default item options updated");
    } catch (error: any) {
      toast.error(`Failed to save options: ${error.message}`);
    } finally {
      setSavingItemOptions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(formData.price);
    const prepNum = parseInt(formData.preparation_time);
    if (!formData.name || !formData.category || isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!restaurant?.restaurant_id) {
      toast.error("Restaurant ID is missing. Please refresh the page.");
      return;
    }
    if (submitting) return;

    try {
      setSubmitting(true);
      const finalImageUrl = imageUrl || formData.image_url;

      const payload = {
        name: formData.name,
        description: formData.description,
        price: priceNum,
        category: formData.category,
        image_url: finalImageUrl,
        available: formData.available,
        preparation_time: isNaN(prepNum) || prepNum <= 0 ? 15 : prepNum,
        options: formData.options
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);
        if (error) throw error;
        setMenuItems(menuItems.map((item) =>
          item.id === editingItem.id
            ? { ...item, ...payload, updated_at: new Date().toISOString() }
            : item
        ));
        toast.success("Menu item updated successfully");
      } else {
        const { data, error } = await supabase
          .from("menu")
          .insert({
            ...payload,
            restaurant_id: restaurant.restaurant_id,
          })
          .select()
          .single();
        if (error) throw error;
        setMenuItems([...menuItems, data]);
        toast.success("Menu item created successfully");
      }
      resetForm();
    } catch (error: any) {
      toast.error(`Failed to save menu item: ${error.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = useCallback((item: MenuItem) => {
    const isCustom = !allCategoryNames.includes(item.category);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category,
      image_url: item.image_url || "",
      available: item.available,
      preparation_time: String(item.preparation_time || 15),
      options: (item.options || []).join(", "),
    });
    setImageUrl(item.image_url || "");
    if (isCustom) {
      setIsCustomCategory(true);
      setCustomCategoryValue(item.category);
    } else {
      setIsCustomCategory(false);
      setCustomCategoryValue("");
    }
    setEditingItem(item);
    setShowForm(true);
  }, [allCategoryNames]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      setDeletingId(id);
      const { error } = await supabase.from("menu").delete().eq("id", id);
      if (error) throw error;
      setMenuItems(menuItems.filter((item) => item.id !== id));
      toast.success("Menu item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete menu item");
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      image_url: "",
      available: true,
      preparation_time: "",
      options: "",
    });
    setImageUrl("");
    setIsCustomCategory(false);
    setCustomCategoryValue("");
    setEditingItem(null);
    setShowForm(false);
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  const uniqueCategories = useMemo(() => {
    const existingCategories = Array.from(new Set(menuItems.map((item) => item.category)));
    return Array.from(new Set([...allCategoryNames, ...existingCategories])).sort();
  }, [menuItems, allCategoryNames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Category Management</h3>
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </button>
        </div>

        {showAddCategory && (
          <div className="mb-4 p-3 bg-white rounded-md border border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                onKeyPress={(e) => e.key === "Enter" && handleAddCustomCategory()}
              />
              <button onClick={handleAddCustomCategory} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Add
              </button>
              <button onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {predefinedCategories.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-1">Predefined Categories:</h5>
              <div className="flex flex-wrap gap-2">
                {predefinedCategories.map((category) => (
                  <div key={category} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                    <span>{category}</span>
                    <button onClick={() => handleRemoveCustomCategory(category)} className="ml-2 text-gray-600 hover:text-gray-800 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {customCategories.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-1">Custom Categories:</h5>
              <div className="flex flex-wrap gap-2">
                {customCategories.map((category) => (
                  <div key={category} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                    <span>{category}</span>
                    <button onClick={() => handleRemoveCustomCategory(category)} className="ml-2 text-blue-600 hover:text-blue-800 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Default Item Options</h3>
        <p className="text-sm text-gray-500 mb-3">
          These options are shown for every item when an order is taken. Waiters can also pick
          extra options you add on individual items in the item form.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={itemOptionsInput}
            onChange={(e) => setItemOptionsInput(e.target.value)}
            placeholder="e.g. Spicy, Hot, Medium, No Salt, No Sugar"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
          <button
            onClick={handleSaveItemOptions}
            disabled={savingItemOptions}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {savingItemOptions ? <><LoadingSpinner size="sm" /><span className="ml-2">Saving...</span></> : "Save Options"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Separate each option with a comma.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
          <p className="text-gray-500">Start by adding your first menu item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-600">{item.category}</span>
                  </div>
                  {item.preparation_time && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.preparation_time}m
                    </div>
                  )}
                </div>
                {item.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>}
                {(item.options || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.options!.map((option) => (
                      <span key={option} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {option}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(item.price, restaurant.currency || 'INR')}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50">
                      {deletingId === item.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={isCustomCategory ? "custom" : formData.category}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomCategory(true);
                        setFormData({ ...formData, category: customCategoryValue });
                      } else {
                        setIsCustomCategory(false);
                        setCustomCategoryValue("");
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required={!isCustomCategory}
                  >
                    <option value="">Select a category</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    <option value="custom">+ Add Custom Category</option>
                  </select>
                  {isCustomCategory && (
                    <input type="text" value={customCategoryValue} onChange={(e) => { setCustomCategoryValue(e.target.value); setFormData({ ...formData, category: e.target.value }); }} placeholder="Enter custom category name" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required autoFocus />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ({restaurant.currency || 'INR'}) *</label>
                  <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Time (minutes) *</label>
                  <input type="number" min="1" max="120" value={formData.preparation_time} onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })} placeholder="15" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customization Options</label>
                  <input
                    type="text"
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder="e.g. Spicy, No Salt, No Sugar, Extra Sambar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma separated. These appear as selectable tags when the waiter orders this item.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  <ImageUpload value={imageUrl} onChange={handleImageChange} onRemove={handleImageRemove} restaurantId={restaurant.restaurant_id} />
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="available" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="available" className="ml-2 block text-sm text-gray-900">Available for ordering</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center">
                    {submitting ? <><LoadingSpinner size="sm" /><span className="ml-2">Saving...</span></> : editingItem ? "Update Item" : "Add Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete}"? This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
