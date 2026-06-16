import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Usuario } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: Usuario | null;
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  currentTenantId: null,
  switchTenant: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Usuario | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const switchTenant = (tenantId: string) => {
    if (userProfile?.role === 'admin') {
      setCurrentTenantId(tenantId);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', u.uid));
          
          if (userDoc.exists()) {
            const profile = userDoc.data() as Usuario;
            // Force admin role if email matches the master account
            if (u.email === 'diogohxcx@gmail.com' && (profile.role !== 'admin' || profile.tenantId !== 'admin_support')) {
              profile.role = 'admin';
              profile.tenantId = 'admin_support';
              await setDoc(doc(db, 'usuarios', u.uid), { role: 'admin', tenantId: 'admin_support' }, { merge: true });
            }
            setUserProfile(profile);
            setCurrentTenantId(profile.tenantId);
          } else {
            // Define role based on email - your email becomes admin
            const isSupportAdmin = u.email === 'diogohxcx@gmail.com';
            const tenantId = isSupportAdmin ? 'admin_support' : `tenant_${u.uid.slice(0, 8)}`;
            
            const newProfile: Usuario = {
              uid: u.uid,
              email: u.email || '',
              role: isSupportAdmin ? 'admin' : 'gerencia',
              tenantId: tenantId,
            };
            
            // Create the tenant document if it doesn't exist
            if (!isSupportAdmin) {
              await setDoc(doc(db, 'tenants', tenantId), {
                name: `Minha Clínica - ${u.displayName || 'Nova Unidade'}`,
                plan: 'trial',
                status: 'ativo',
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)), // 15 days trial
                createdAt: Timestamp.now()
              });
            } else {
              // Create support admin tenant just in case
              await setDoc(doc(db, 'tenants', 'admin_support'), {
                name: 'Suporte Administrativo',
                plan: 'trial',
                status: 'ativo',
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
                createdAt: Timestamp.now()
              });
            }
            
            await setDoc(doc(db, 'usuarios', u.uid), newProfile);
            setUserProfile(newProfile);
            setCurrentTenantId(tenantId);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        setCurrentTenantId(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, currentTenantId, switchTenant, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
