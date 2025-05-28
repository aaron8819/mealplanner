import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './Login/Login.module.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      onLogin?.(data.user);
    }

    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      onLogin?.(data.user);
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Login / Sign Up</h2>
      {errorMsg && <p className={styles.errorMessage}>{errorMsg}</p>}

      <form className={styles.form}>
        <input
          className={styles.inputField}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={styles.inputField}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className={styles.buttonGroup}>
          <button
            onClick={handleLogin}
            className={`${styles.button} ${styles.loginButton}`}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <button
            onClick={handleSignup}
            className={`${styles.button} ${styles.signupButton}`}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}
