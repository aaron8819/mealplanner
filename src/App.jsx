import React, { useEffect, useState } from 'react';
import MealPlanner from './components/mealplanner/MealPlanner';
import Login from './components/ui/Login';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <p className="p-4 text-gray-600">Loading session...</p>;
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
  <div className="flex justify-between items-center mb-4">
    <h1 className="text-2xl font-bold">Meal Planner</h1>

    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">
        Welcome, <span className="font-medium">{user.email}</span>
      </span>
      <button
        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
        onClick={handleLogout}
      >
        Log out
      </button>
    </div>
  </div>

  <MealPlanner user={user} />
</div>

  );
}
