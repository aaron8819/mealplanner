import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CustomItemManager({ user, customItems, setCustomItems }) {
  const [customName, setCustomName] = useState('');

  // ✅ Fetch custom items
  useEffect(() => {
    if (!user) return;

    async function loadCustomItems() {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('source', 'custom');

      if (error) {
        console.error('Error loading custom items:', error);
      } else {
        setCustomItems(data || []);
      }
    }

    loadCustomItems();
  }, [user, setCustomItems]);

  // ✅ Add item
  const addCustomItem = async () => {
    if (!customName.trim() || !user) return;

    const item = {
      name: customName,
      user_id: user.id,
      source: 'custom',
    };

    const { data, error } = await supabase.from('shopping_items').insert([item]).select();

    if (error) {
      console.error('Error inserting custom item:', error);
    } else {
      setCustomItems((prev) => [...prev, ...data]);
      setCustomName('');
    }
  };

  // ✅ Delete item
  const deleteCustomItem = async (index) => {
    const item = customItems[index];
    if (!item?.id || !user) return;

    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting custom item:', error);
    } else {
      setCustomItems(customItems.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="flex gap-2 mb-3">
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="e.g. foil, paper towels..."
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={addCustomItem}
        >
          Add
        </button>
      </div>

      {customItems.length > 0 && (
        <ul className="space-y-1">
          {customItems.map((item, index) => (
            <li
              key={item.id || index}
              className="flex justify-between items-center bg-gray-50 px-3 py-1 rounded"
            >
              <span>{item.name}</span>
              <button
                onClick={() => deleteCustomItem(index)}
                className="text-red-500 text-sm hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
