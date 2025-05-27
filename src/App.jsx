import { useEffect, useState } from 'react';
import MealPlanner from './components/mealplanner/MealPlanner';
import Login from './components/ui/Login';
import { supabase } from './lib/supabaseClient';
import { LoadingSpinner } from './components/ui';
import { LogOut, RotateCcw } from 'lucide-react';
import { KeyboardShortcutsHelp } from './components/ui/keyboard-shortcuts-help';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mealPlannerKey, setMealPlannerKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Error fetching user:', error);
      } else {
        setUser(data?.user || null);
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); // Clear local state
  };

  const handleReset = async () => {
    if (!user) return;

    // Clear Supabase data
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

    // Force MealPlanner to re-render and reset state
    setMealPlannerKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-4 bg-gray-100 flex items-center justify-center">
        <Login onLogin={setUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meal Planner</h1>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Welcome, <span className="font-medium text-gray-900">{user.email}</span>
          </span>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#6b7280';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#d1d5db';
            }}
            title="Reset all selections and shopping list"
          >
            <RotateCcw style={{ width: '16px', height: '16px' }} />
            Reset
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#fef2f2';
              e.target.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            Log out
          </button>
        </div>
      </div>

      <MealPlanner key={mealPlannerKey} user={user} />
      <KeyboardShortcutsHelp />
    </div>

  );
}
