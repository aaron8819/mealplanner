import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button'; // Adjust if using a different Button component

export default function ResetButton({ user, setSelectedRecipes, onResetComplete }) {
  const handleReset = async () => {
    if (!user) return;

    // Clear Supabase shopping_items and manual_removals
    const { error: itemError } = await supabase
      .from('shopping_items')
      .delete()
      .eq('user_id', user.id);

    const { error: removalError } = await supabase
      .from('manual_removals')
      .delete()
      .eq('user_id', user.id);

    if (itemError || removalError) {
      console.error('❌ Reset failed:', itemError || removalError);
      return;
    }

    // Clear selected recipes in React state
    setSelectedRecipes([]);

    // Notify parent to re-fetch if needed
    if (onResetComplete) onResetComplete();
  };

  return (
    <Button onClick={handleReset} className="bg-red-500 hover:bg-red-600 text-white">
      Reset
    </Button>
  );
}
