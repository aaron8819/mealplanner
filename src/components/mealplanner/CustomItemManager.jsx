import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import styles from './CustomItemManager/CustomItemManager.module.css';

export default function CustomItemManager({ user, customItems, setCustomItems }) {
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removingItems, setRemovingItems] = useState(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);

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

        // Show success feedback
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);

        // Focus input for continued adding
        if (inputRef.current) {
          inputRef.current.focus();
        }
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


  // ✅ Delete item with animation
  const deleteCustomItem = async (index) => {
    const item = customItems[index];
    if (!item?.id || !user) return;

    // Add to removing set for animation
    setRemovingItems(prev => new Set([...prev, item.id]));

    // Wait for animation
    setTimeout(async () => {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting custom item:', error);
        // Remove from removing set on error
        setRemovingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      } else {
        setCustomItems(customItems.filter((_, i) => i !== index));
        setRemovingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    }, 200);
  };

  // Focus input helper
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={styles.container}>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
          className="mb-3"
        />
      )}

      {/* Input Section */}
      <div className={styles.inputSection}>
        <input
          ref={inputRef}
          className={`${styles.inputField} ${showSuccess ? styles.successFeedback : ''}`}
          placeholder="Add custom items (comma separated)..."
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
          disabled={loading || !customName.trim()}
          className={`${styles.button} ${styles.addButton}`}
        >
          {loading && <LoadingSpinner size="sm" />}
          ➕ Add
        </button>
        <button
          onClick={resetCustomItems}
          disabled={loading || customItems.length === 0}
          className={`${styles.button} ${styles.resetButton}`}
        >
          Reset
        </button>
      </div>

      {/* Tags Section */}
      {customItems.length > 0 ? (
        <div className={styles.tagsSection}>
          {customItems.map((item, index) => (
            <div
              key={item.id || index}
              className={`${styles.tag} ${removingItems.has(item.id) ? styles.removing : ''}`}
            >
              <span className={styles.tagText}>{item.name}</span>
              <button
                onClick={() => deleteCustomItem(index)}
                className={styles.tagRemove}
                title={`Remove ${item.name}`}
              >
                ×
              </button>
            </div>
          ))}
          <div
            className={styles.addMorePrompt}
            onClick={focusInput}
            title="Click to add more items"
          >
            + Add more...
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No custom items added yet.</p>
          <p>Add items like "milk, bread, eggs" above!</p>
        </div>
      )}
    </div>
  );
}
