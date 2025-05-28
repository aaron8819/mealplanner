import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button'; // Adjust if using a different Button component

export default function ResetButton({ user, setSelectedRecipes, onResetComplete }) {
  const handleReset = async () => {
    if (!user) return;

    // Clear all Supabase user data
    const { error: itemError } = await supabase
      .from('shopping_items')
      .delete()
      .eq('user_id', user.id);

    const { error: removalError } = await supabase
      .from('manual_removals')
      .delete()
      .eq('user_id', user.id);

    const { error: selectedError } = await supabase
      .from('selected_recipes')
      .delete()
      .eq('user_id', user.id);

    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id);

    if (itemError || removalError || selectedError || preferencesError) {
      console.error('❌ Reset failed:', itemError || removalError || selectedError || preferencesError);
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
