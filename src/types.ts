export interface Story {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  genre?: string;
  coverUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  content: string;
  order: number;
  authorId: string;
  notes?: string;
  review?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CharacterProfile {
  id: string;
  storyId: string;
  name: string;
  role: string;
  traits: string;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
