import { useEffect, useState } from 'react';
import MealPlanner from './components/mealplanner/MealPlanner';
import Login from './components/ui/Login';
import { supabase } from './lib/supabaseClient';
import { LoadingSpinner } from './components/ui';
import { LogOut, RotateCcw } from 'lucide-react';
import { KeyboardShortcutsHelp } from './components/ui/keyboard-shortcuts-help';
import styles from './App.module.css';

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
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div>
            <LoadingSpinner size="lg" />
            <p className={styles.loadingText}>Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Login onLogin={setUser} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Meal Planner</h1>

          <div className={styles.userSection}>
            <span className={styles.welcomeText}>
              Welcome, <span className={styles.userEmail}>{user.email}</span>
            </span>
            <button
              onClick={handleReset}
              className={styles.resetButton}
              title="Reset all selections and shopping list"
            >
              <RotateCcw style={{ width: '16px', height: '16px' }} />
              Reset
            </button>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <MealPlanner key={mealPlannerKey} user={user} />
        <KeyboardShortcutsHelp />
      </main>
    </div>
  );
}
