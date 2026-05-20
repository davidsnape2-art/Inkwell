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
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
