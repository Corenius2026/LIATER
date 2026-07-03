import React, { createContext, useState, useContext, useEffect } from 'react';
import { MOCK_USERS } from '../auth/MOCK_USERS';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('users');
    return savedUsers ? JSON.parse(savedUsers) : MOCK_USERS;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true, role: user.role };
    }
    return { success: false, message: 'Credenciales incorrectas' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const registerUser = (newUser) => {
    if (users.some(u => u.email === newUser.email)) {
      return { success: false, message: 'El correo ya está registrado' };
    }
    const createdUser = {
      id: `u_${Date.now()}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=3b82f6&color=fff&size=150`,
      ...newUser
    };
    setUsers(prev => [...prev, createdUser]);
    return { success: true, user: createdUser };
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, registerUser, users }}>
      {children}
    </AuthContext.Provider>
  );
};
