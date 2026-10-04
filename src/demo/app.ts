/** デモモード用の firebase/app 代替（何もしない） */
export interface FirebaseApp {
  name: string;
}

export function initializeApp(_config: object): FirebaseApp {
  return { name: 'demo' };
}
