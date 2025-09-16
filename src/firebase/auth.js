// src/firebase/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// REGISTRO DE USUARIO
export const registerUser = async (email, password, nombreCompleto, rol = 'operador') => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    nombre_completo: nombreCompleto,
    email,
    rol,
  });
};

// LOGIN CON DEVOLUCIÓN DE ROL
export const loginUser = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const userDoc = await getDoc(doc(db, 'usuarios', uid));
  const userData = userDoc.data();

  return { rol: userData?.rol ?? 'operador', uid };
};

// CERRAR SESIÓN
export const logoutUser = () => signOut(auth);

// === NUEVO: ENVIAR CORREO DE RECUPERACIÓN ===
export const sendResetPassword = async (email) => {
  return await sendPasswordResetEmail(auth, email);
};

// === NUEVO: CAMBIAR CONTRASEÑA (requiere sesión y re-autenticación) ===
export const changeUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No hay sesión activa');

  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
  return true;
};
