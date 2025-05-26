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

  const names = customName
    .split(',')
    .map(n => n.trim().toLowerCase())
    .filter(n => n);

  if (names.length === 0) return;

  const inserts = names.map(name => ({
    name,
    user_id: user.id,
    source: 'custom',
  }));

  const { data, error } = await supabase
    .from('shopping_items')
    .insert(inserts)
    .select();

  if (error) {
    console.error('Error inserting custom items:', error);
  } else {
    setCustomItems(prev => [...prev, ...data]);
    setCustomName('');
  }
};
//Reset custom items
const resetCustomItems = async () => {
  if (!user) return;

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('user_id', user.id)
    .eq('source', 'custom');

  if (error) {
    console.error('Error resetting custom items:', error);
  } else {
    setCustomItems([]);
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
    placeholder="Add custom items (comma separated)"
    value={customName}
    onChange={(e) => setCustomName(e.target.value)}
  />
  <button
    className="bg-blue-500 text-white px-3 py-1 rounded"
    onClick={addCustomItem}
  >
    Add
  </button>
  <button
    className="bg-red-500 text-white px-3 py-1 rounded"
    onClick={resetCustomItems}
  >
    Reset
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
