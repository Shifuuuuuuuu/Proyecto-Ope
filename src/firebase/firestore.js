
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';

export const obtenerSiguienteId = async (coleccion) => {
  const snapshot = await getDocs(collection(db, coleccion));
  let maxId = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const id = parseInt(data.id);
    if (!isNaN(id) && id > maxId) {
      maxId = id;
    }
  });
  return (maxId + 1).toString();
};
