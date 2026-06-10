import { Category, Difficulty } from "./theme";

export interface Recipe {
  id: string;
  title: string;
  category: Category;
  ingredients: string[];
  instructions: string[];
  image: string | null; // remote URL or base64 data URI
  cookTime: number; // minutes
  servings: number;
  difficulty: Difficulty;
  favorite: boolean;
  createdAt: number;
}
