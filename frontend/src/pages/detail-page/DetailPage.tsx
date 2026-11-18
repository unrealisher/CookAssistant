import { RecipeDetailWidget } from "../../widgets/recipe-detail/RecipeDetailWidget";

interface DetailPageProps {
  recipeId: number;
  onBack: () => void;
  onEdit: (recipeId: number) => void;
  onDeleted: () => void;
  onUnauthorized: () => void;
}

export function DetailPage(props: DetailPageProps) {
  return <RecipeDetailWidget {...props} />;
}
