import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';

export default function CustomItemManager({ user, customItems, setCustomItems }) {
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);
    setError('');

    try {
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
        setError('Failed to add custom items. Please try again.');
      } else {
        setCustomItems(prev => [...prev, ...data]);
        setCustomName('');
      }
    } catch (error) {
      console.error('Add custom item failed:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
    <div>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
          className="mb-3"
        />
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <input
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 12px',
            width: '300px',
            fontSize: '14px',
            outline: 'none'
          }}
          placeholder="Add custom items (comma separated)"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomItem();
            }
          }}
        />
        <button
          onClick={addCustomItem}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}
        >
          {loading && <LoadingSpinner size="sm" />}
          + Add
        </button>
        <button
          onClick={resetCustomItems}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          Reset
        </button>
      </div>


      {customItems.length > 0 && (
        <ul className="space-y-1">
          {customItems.map((item, index) => (
            <li key={item.id || index} className="bg-gray-50 p-2 rounded hover:bg-gray-100 transition-colors text-sm">
              {item.name}
              <span style={{ marginLeft: '8px' }}>
                <button
                  onClick={() => deleteCustomItem(index)}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="Delete custom item"
                >
                  🗑️
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
