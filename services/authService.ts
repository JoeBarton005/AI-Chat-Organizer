import { User } from "../types";
import { createId } from "./storageService";

const USERS_STORAGE_KEY = "context_book_users_v1";
const SESSION_KEY = "context_book_session_v1";

// --- Encryption Helper ---
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_salt_context_book"); // Simple salting
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- Data Access ---
const getUsers = (): User[] => {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Auth DB Error:", e);
    return [];
  }
};

const saveUsers = (users: User[]) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Auth Save Error:", e);
    throw new Error("Storage full or unavailable");
  }
};

// --- Auth Methods ---

export const loginUser = async (username: string, password: string): Promise<User> => {
  // Simulate network delay for realism
  await new Promise(resolve => setTimeout(resolve, 300));

  const users = getUsers();
  const hashedPassword = await hashPassword(password);
  
  const user = users.find(u => u.username === username && u.passwordHash === hashedPassword);
  
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  throw new Error("用户名或密码错误");
};

export const registerUser = async (username: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    throw new Error("该用户名已被注册");
  }

  const hashedPassword = await hashPassword(password);

  const newUser: User = {
    id: createId(),
    username,
    passwordHash: hashedPassword,
    createdAt: Date.now()
  };

  users.push(newUser);
  saveUsers(users);
  
  // Auto login
  localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  return newUser;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

// Sync check for app initialization
export const getCurrentUser = (): User | null => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};